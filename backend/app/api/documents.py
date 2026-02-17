from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.document import PackageDocument, DocumentTemplate
from app.models.request import AcquisitionRequest
from app.models.activity import ActivityLog
from app.services.ai_service import generate_draft, review_document

documents_bp = Blueprint('documents', __name__)


@documents_bp.route('/request/<int:request_id>', methods=['GET'])
@jwt_required()
def list_documents(request_id):
    """Get document checklist for a request, grouped by gate."""
    docs = PackageDocument.query.filter_by(request_id=request_id).all()

    # Group by required_before_gate
    grouped = {}
    for doc in docs:
        gate = doc.required_before_gate or 'other'
        if gate not in grouped:
            grouped[gate] = []
        grouped[gate].append(doc.to_dict())

    # Also return flat list
    return jsonify({
        'documents': [d.to_dict() for d in docs],
        'grouped': grouped,
        'total': len(docs),
        'required': sum(1 for d in docs if d.is_required),
        'complete': sum(1 for d in docs if d.status == 'complete'),
    })


@documents_bp.route('/<int:doc_id>', methods=['PUT'])
@jwt_required()
def update_document(doc_id):
    """Update document status, content, or assignment."""
    doc = PackageDocument.query.get_or_404(doc_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    updatable = ['status', 'content', 'assigned_to', 'due_date', 'completed_date', 'notes']
    for field in updatable:
        if field in data:
            setattr(doc, field, data[field])

    if data.get('status') == 'complete' and not doc.completed_date:
        doc.completed_date = datetime.utcnow().strftime('%Y-%m-%d')

    doc.updated_at = datetime.utcnow()

    # Log activity
    log = ActivityLog(
        request_id=doc.request_id,
        activity_type='document_updated',
        description=f'Document "{doc.title}" updated to {doc.status}',
        actor=data.get('actor', 'Unknown'),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(doc.to_dict())


@documents_bp.route('/<int:doc_id>/draft-ai', methods=['POST'])
@jwt_required()
def draft_ai(doc_id):
    """Trigger AI draft generation for a document."""
    doc = PackageDocument.query.get_or_404(doc_id)

    if not doc.template or not doc.template.ai_assistable:
        return jsonify({'error': 'This document type does not support AI drafting'}), 400

    acq = AcquisitionRequest.query.get(doc.request_id)
    if not acq:
        return jsonify({'error': 'Associated request not found'}), 404

    data = request.get_json() or {}
    user_message = data.get('message') or data.get('prompt')

    # Map document type to AI service type
    doc_type_map = {
        'market_research': 'mrr',
        'ja_brand_name': 'ja',
        'acquisition_strategy': 'acquisition_strategy',
        'requirements_description': 'requirements_description',
        'igce': 'igce',
        'qasp': 'qasp',
        'source_selection': 'source_selection',
    }
    ai_doc_type = doc_type_map.get(doc.document_type, doc.document_type)

    request_data = acq.to_dict()
    result = generate_draft(ai_doc_type, request_data, user_message)

    if result.get('success'):
        doc.content = result.get('text', '')
        doc.ai_generated = True
        if doc.status == 'not_started':
            doc.status = 'in_progress'
        doc.updated_at = datetime.utcnow()

        log = ActivityLog(
            request_id=doc.request_id,
            activity_type='ai_draft',
            description=f'AI draft generated for "{doc.title}"',
            actor='AI Assistant',
        )
        db.session.add(log)
        db.session.commit()

    return jsonify({
        'document': doc.to_dict(),
        'ai_result': result,
    })


@documents_bp.route('/<int:doc_id>/review-ai', methods=['POST'])
@jwt_required()
def review_ai(doc_id):
    """Trigger AI compliance review for a document."""
    doc = PackageDocument.query.get_or_404(doc_id)

    if not doc.content:
        return jsonify({'error': 'Document has no content to review'}), 400

    acq = AcquisitionRequest.query.get(doc.request_id)
    request_data = acq.to_dict() if acq else {}

    result = review_document(doc.document_type, doc.content, request_data)

    log = ActivityLog(
        request_id=doc.request_id,
        activity_type='ai_review',
        description=f'AI compliance review for "{doc.title}"',
        actor='AI Assistant',
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(result)
