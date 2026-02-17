from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.approval import ApprovalStep
from app.models.request import AcquisitionRequest
from app.models.user import User
from app.services.workflow import process_approval, get_approval_status
from app.services.gate_checker import check_gate_readiness

approvals_bp = Blueprint('approvals', __name__)


@approvals_bp.route('/queue', methods=['GET'])
@jwt_required()
def approval_queue():
    """Get pending approval items for the current user's role."""
    claims = get_jwt()
    user_role = claims.get('role', '')

    # Find active steps matching user's role
    query = ApprovalStep.query.filter_by(
        status='active',
        approver_role=user_role,
    )

    steps = query.all()

    # Enrich with request info
    items = []
    for step in steps:
        req = AcquisitionRequest.query.get(step.request_id)
        items.append({
            'step': step.to_dict(),
            'request': {
                'id': req.id,
                'request_number': req.request_number,
                'title': req.title,
                'estimated_value': req.estimated_value,
                'derived_acquisition_type': req.derived_acquisition_type,
                'derived_tier': req.derived_tier,
                'status': req.status,
                'requestor_name': req.requestor_name,
            } if req else None,
        })

    return jsonify({
        'queue': items,
        'count': len(items),
        'role': user_role,
    })


@approvals_bp.route('/request/<int:request_id>', methods=['GET'])
@jwt_required()
def request_approvals(request_id):
    """Get approval steps and status for a specific request."""
    status = get_approval_status(request_id)
    return jsonify(status)


@approvals_bp.route('/<int:step_id>/action', methods=['POST'])
@jwt_required()
def approval_action(step_id):
    """Process an approval action (approve/reject/return)."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    action = data.get('action')
    if action not in ('approve', 'reject', 'return'):
        return jsonify({'error': 'Action must be approve, reject, or return'}), 400

    # Verify the user has the right role
    step = ApprovalStep.query.get(step_id)
    if not step:
        return jsonify({'error': 'Step not found'}), 404

    user_role = claims.get('role', '')
    if step.approver_role != user_role and user_role != 'admin':
        return jsonify({'error': f'Your role ({user_role}) does not match required role ({step.approver_role})'}), 403

    actor_name = claims.get('name', 'Unknown')
    comments = data.get('comments')

    result = process_approval(step_id, action, actor_name, int(user_id), comments)
    if 'error' in result:
        return jsonify(result), 400

    return jsonify(result)


@approvals_bp.route('/<int:step_id>/gate-check', methods=['GET'])
@jwt_required()
def gate_check(step_id):
    """Check gate readiness for an approval step."""
    step = ApprovalStep.query.get_or_404(step_id)

    # Map step name to gate name
    gate_map = {
        'ISS Review': 'iss',
        'ASR Review': 'asr',
        'Finance Review': 'finance',
        'KO Review': 'ko_review',
        'Legal Review': 'legal',
        'CIO Approval': 'cio_approval',
        'Senior Leadership': 'senior_review',
        'COR Review': 'iss',
        'Supervisor Approval': 'iss',
        'GPC Purchase': 'finance',
    }

    gate_name = gate_map.get(step.step_name, 'ko_review')
    result = check_gate_readiness(step.request_id, gate_name)

    return jsonify(result)
