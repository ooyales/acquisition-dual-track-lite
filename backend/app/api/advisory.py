import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.advisory import AdvisoryInput
from app.models.request import AcquisitionRequest
from app.models.activity import ActivityLog
from app.services.notifications import notify_requestor, notify_users_by_team

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'advisory_uploads')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'zip'}

advisory_bp = Blueprint('advisory', __name__)


@advisory_bp.route('/queue', methods=['GET'])
@jwt_required()
def advisory_queue():
    """Get pending advisory items for the user's team."""
    claims = get_jwt()
    user_team = claims.get('team', '')
    user_role = claims.get('role', '')

    # Map roles to teams for advisory routing
    role_team_map = {
        'scrm': 'scrm',
        'sb': 'sbo',
        'cto': 'cio',
        'cio': 'cio',
        'legal': 'legal',
        'budget': 'fm',
    }

    team = role_team_map.get(user_role, '') or user_team

    query = AdvisoryInput.query.filter(
        AdvisoryInput.status.in_(['requested', 'in_review', 'info_requested'])
    )

    if team and user_role != 'admin':
        query = query.filter(AdvisoryInput.team == team)

    advisories = query.all()

    items = []
    for adv in advisories:
        req = AcquisitionRequest.query.get(adv.request_id)

        # Find files shared by other advisories on the same request
        shared_attachments = []
        sibling_advisories = AdvisoryInput.query.filter(
            AdvisoryInput.request_id == adv.request_id,
            AdvisoryInput.id != adv.id,
            AdvisoryInput.info_response_filename.isnot(None),
        ).all()
        for sib in sibling_advisories:
            shared_attachments.append({
                'advisory_id': sib.id,
                'team': sib.team,
                'filename': sib.info_response_filename,
            })

        items.append({
            'advisory': adv.to_dict(),
            'request': {
                'id': req.id,
                'request_number': req.request_number,
                'title': req.title,
                'estimated_value': req.estimated_value,
                'derived_acquisition_type': req.derived_acquisition_type,
                'derived_tier': req.derived_tier,
                'intake_q_buy_category': req.intake_q_buy_category,
            } if req else None,
            'shared_attachments': shared_attachments,
        })

    return jsonify({
        'queue': items,
        'count': len(items),
        'team': team,
    })


@advisory_bp.route('/request/<int:request_id>', methods=['GET'])
@jwt_required()
def request_advisories(request_id):
    """Get all advisory inputs for a specific request."""
    advisories = AdvisoryInput.query.filter_by(request_id=request_id).all()

    # Collect all attachments across all advisories for this request
    all_attachments = []
    for a in advisories:
        if a.info_response_filename:
            all_attachments.append({
                'advisory_id': a.id,
                'team': a.team,
                'filename': a.info_response_filename,
            })

    return jsonify({
        'advisories': [a.to_dict() for a in advisories],
        'count': len(advisories),
        'shared_attachments': all_attachments,
    })


@advisory_bp.route('/<int:advisory_id>', methods=['POST'])
@jwt_required()
def submit_advisory(advisory_id):
    """Submit advisory findings."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    adv = AdvisoryInput.query.get_or_404(advisory_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    recommendation = data.get('recommendation', '')

    # Handle "Request Information" flow
    if recommendation == 'request_info':
        adv.status = 'info_requested'
        adv.info_request_message = data.get('info_request_message', '')
        adv.reviewer_id = int(user_id)
        adv.recommendation = 'request_info'
        adv.findings = data.get('findings')

        log = ActivityLog(
            request_id=adv.request_id,
            activity_type='advisory_info_requested',
            description=f'{adv.team.upper()} advisory is requesting additional information',
            actor=claims.get('name', 'Unknown'),
        )
        db.session.add(log)

        req = AcquisitionRequest.query.get(adv.request_id)
        title_name = req.title if req else f'Request #{adv.request_id}'
        notify_requestor(
            adv.request_id, 'info_requested',
            f'{adv.team.upper()} team needs more information',
            f'The {adv.team.upper()} reviewer is requesting additional information for "{title_name}": {adv.info_request_message}'
        )

        db.session.commit()
        return jsonify(adv.to_dict())

    # Normal completion flow
    adv.status = data.get('status', 'complete_no_issues')
    adv.findings = data.get('findings')
    adv.recommendation = recommendation
    adv.impacts_strategy = data.get('impacts_strategy', False)
    adv.reviewer_id = int(user_id)
    adv.completed_date = datetime.utcnow()

    # Update denormalized status on request
    req = AcquisitionRequest.query.get(adv.request_id)
    if req:
        status_field = {
            'scrm': 'scrm_status',
            'sbo': 'sbo_status',
            'cio': 'cio_status',
            'section508': 'section508_status',
        }.get(adv.team)

        if status_field:
            setattr(req, status_field, adv.status)

        notes_field = {
            'scrm': 'scrm_notes',
            'sbo': 'sbo_notes',
            'cio': 'cio_notes',
        }.get(adv.team)

        if notes_field and adv.findings:
            setattr(req, notes_field, adv.findings)

    log = ActivityLog(
        request_id=adv.request_id,
        activity_type='advisory_completed',
        description=f'{adv.team.upper()} advisory completed: {adv.status}',
        actor=claims.get('name', 'Unknown'),
    )
    db.session.add(log)

    # Notify requestor that advisory is complete
    notify_requestor(
        adv.request_id, 'advisory_completed',
        f'{adv.team.upper()} advisory completed',
        f'The {adv.team.upper()} advisory review for your request is complete. Status: {adv.status.replace("_", " ").title()}.'
    )

    db.session.commit()

    return jsonify(adv.to_dict())


@advisory_bp.route('/<int:advisory_id>/respond', methods=['POST'])
@jwt_required()
def respond_to_info_request(advisory_id):
    """Requestor responds to an advisory info request, optionally with a file."""
    claims = get_jwt()
    adv = AdvisoryInput.query.get_or_404(advisory_id)

    if adv.status != 'info_requested':
        return jsonify({'error': 'This advisory is not awaiting information'}), 400

    # Support both JSON and multipart/form-data
    if request.content_type and 'multipart/form-data' in request.content_type:
        response_text = request.form.get('response', '')
        uploaded_file = request.files.get('file')
    else:
        data = request.get_json() or {}
        response_text = data.get('response', '')
        uploaded_file = None

    if not response_text.strip() and not uploaded_file:
        return jsonify({'error': 'Please provide a response or upload a file'}), 400

    adv.info_response = response_text
    adv.status = 'requested'  # Return to reviewer's queue

    # Handle file upload
    if uploaded_file and uploaded_file.filename:
        filename = secure_filename(uploaded_file.filename)
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f'File type .{ext} not allowed'}), 400

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        # Prefix with advisory ID to avoid collisions
        stored_name = f'{adv.id}_{filename}'
        filepath = os.path.join(UPLOAD_DIR, stored_name)
        uploaded_file.save(filepath)
        adv.info_response_filename = filename
        adv.info_response_filepath = filepath

    log = ActivityLog(
        request_id=adv.request_id,
        activity_type='advisory_info_provided',
        description=f'Requestor provided information for {adv.team.upper()} advisory',
        actor=claims.get('name', 'Unknown'),
    )
    db.session.add(log)

    # Notify the advisory team that info has been provided
    req = AcquisitionRequest.query.get(adv.request_id)
    title_name = req.title if req else f'Request #{adv.request_id}'
    file_note = f' (with attached file: {adv.info_response_filename})' if adv.info_response_filename else ''
    notify_users_by_team(
        adv.team, adv.request_id, 'info_provided',
        f'Information provided for {title_name}',
        f'The requestor has provided additional information{file_note} for "{title_name}". Please review and continue your advisory.'
    )

    db.session.commit()
    return jsonify(adv.to_dict())


@advisory_bp.route('/<int:advisory_id>/attachment', methods=['GET'])
@jwt_required()
def download_attachment(advisory_id):
    """Download the file attached to an advisory info response."""
    adv = AdvisoryInput.query.get_or_404(advisory_id)
    if not adv.info_response_filepath or not os.path.exists(adv.info_response_filepath):
        return jsonify({'error': 'No attachment found'}), 404
    return send_file(
        adv.info_response_filepath,
        download_name=adv.info_response_filename,
        as_attachment=True,
    )


@advisory_bp.route('/<int:advisory_id>', methods=['PUT'])
@jwt_required()
def update_advisory(advisory_id):
    """Update an existing advisory."""
    adv = AdvisoryInput.query.get_or_404(advisory_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    updatable = ['status', 'findings', 'recommendation', 'impacts_strategy', 'blocks_gate']
    for field in updatable:
        if field in data:
            setattr(adv, field, data[field])

    if data.get('status') in ('complete_no_issues', 'complete_issues_found', 'waived'):
        adv.completed_date = datetime.utcnow()

    db.session.commit()
    return jsonify(adv.to_dict())
