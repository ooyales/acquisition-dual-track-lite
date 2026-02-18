import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.document import PackageDocument, DocumentTemplate
from app.models.request import AcquisitionRequest
from app.models.activity import ActivityLog
from app.services.ai_service import generate_draft, review_document

DOC_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'doc_uploads')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'zip', 'pptx'}

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


TOGGLE_ROLES = {'admin', 'budget', 'ko', 'branch_chief', 'cto', 'cio'}


@documents_bp.route('/<int:doc_id>/toggle-required', methods=['POST'])
@jwt_required()
def toggle_required(doc_id):
    """Toggle a document between required and not-required."""
    claims = get_jwt()
    role = claims.get('role', '')
    if role not in TOGGLE_ROLES:
        return jsonify({'error': 'Only procurement/budget staff can toggle document requirements'}), 403

    doc = PackageDocument.query.get_or_404(doc_id)
    data = request.get_json() or {}
    is_required = data.get('is_required', not doc.is_required)

    if is_required:
        doc.is_required = True
        doc.was_required = True
        if doc.status == 'not_required':
            doc.status = 'not_started'
    else:
        doc.was_required = doc.is_required
        doc.is_required = False
        doc.status = 'not_required'

    doc.updated_at = datetime.utcnow()

    log = ActivityLog(
        request_id=doc.request_id,
        activity_type='document_toggled',
        description=f'Document "{doc.title or doc.template.name}" marked {"required" if is_required else "not required"}',
        actor=claims.get('name', 'Unknown'),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(doc.to_dict())


@documents_bp.route('/<int:doc_id>/upload', methods=['POST'])
@jwt_required()
def upload_document_file(doc_id):
    """Upload a file for a document."""
    claims = get_jwt()
    doc = PackageDocument.query.get_or_404(doc_id)

    uploaded_file = request.files.get('file')
    if not uploaded_file or not uploaded_file.filename:
        return jsonify({'error': 'No file provided'}), 400

    filename = secure_filename(uploaded_file.filename)
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': f'File type .{ext} not allowed'}), 400

    os.makedirs(DOC_UPLOAD_DIR, exist_ok=True)
    stored_name = f'{doc.request_id}_{doc.id}_{filename}'
    filepath = os.path.join(DOC_UPLOAD_DIR, stored_name)
    uploaded_file.save(filepath)

    doc.uploaded_filename = filename
    doc.uploaded_filepath = filepath
    doc.status = 'uploaded'
    doc.updated_at = datetime.utcnow()

    log = ActivityLog(
        request_id=doc.request_id,
        activity_type='document_uploaded',
        description=f'File "{filename}" uploaded for "{doc.title or doc.template.name}"',
        actor=claims.get('name', 'Unknown'),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(doc.to_dict())


@documents_bp.route('/<int:doc_id>/download', methods=['GET'])
@jwt_required()
def download_document_file(doc_id):
    """Download an uploaded document file."""
    doc = PackageDocument.query.get_or_404(doc_id)
    if not doc.uploaded_filepath or not os.path.exists(doc.uploaded_filepath):
        return jsonify({'error': 'No file uploaded for this document'}), 404
    return send_file(
        doc.uploaded_filepath,
        download_name=doc.uploaded_filename,
        as_attachment=True,
    )
