from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.request import AcquisitionRequest
from app.models.activity import ActivityLog
from app.services.workflow import submit_request as workflow_submit

requests_bp = Blueprint('requests', __name__)


def _generate_request_number():
    """Generate a unique request number like ACQ-2026-0001."""
    year = datetime.utcnow().strftime('%Y')
    last = AcquisitionRequest.query.filter(
        AcquisitionRequest.request_number.like(f'ACQ-{year}-%')
    ).order_by(AcquisitionRequest.id.desc()).first()

    if last:
        try:
            seq = int(last.request_number.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1

    return f'ACQ-{year}-{seq:04d}'


@requests_bp.route('', methods=['GET'])
@jwt_required()
def list_requests():
    """List acquisition requests with filters and pagination.
    ---
    tags:
      - Requests
    parameters:
      - name: status
        in: query
        type: string
        required: false
        description: Filter by status (draft, submitted, approved, etc.)
      - name: type
        in: query
        type: string
        required: false
        description: Filter by derived acquisition type
      - name: tier
        in: query
        type: string
        required: false
        description: Filter by derived tier (micro, sat, above_sat)
      - name: search
        in: query
        type: string
        required: false
        description: Search across title, request_number, description
      - name: pipeline
        in: query
        type: string
        required: false
        description: Filter by derived pipeline
      - name: fiscal_year
        in: query
        type: string
        required: false
      - name: sort
        in: query
        type: string
        required: false
        default: created_desc
        enum: [created_desc, created_asc, value_desc, value_asc]
      - name: page
        in: query
        type: integer
        required: false
        default: 1
      - name: per_page
        in: query
        type: integer
        required: false
        default: 50
    responses:
      200:
        description: Paginated list of acquisition requests
        schema:
          type: object
          properties:
            requests:
              type: array
              items:
                $ref: '#/definitions/AcquisitionRequest'
            total:
              type: integer
            page:
              type: integer
            pages:
              type: integer
            per_page:
              type: integer
    """
    query = AcquisitionRequest.query

    # Filters
    status = request.args.get('status')
    if status:
        query = query.filter(AcquisitionRequest.status == status)

    acq_type = request.args.get('type')
    if acq_type:
        query = query.filter(AcquisitionRequest.derived_acquisition_type == acq_type)

    tier = request.args.get('tier')
    if tier:
        query = query.filter(AcquisitionRequest.derived_tier == tier)

    search = request.args.get('search')
    if search:
        query = query.filter(
            db.or_(
                AcquisitionRequest.title.ilike(f'%{search}%'),
                AcquisitionRequest.request_number.ilike(f'%{search}%'),
                AcquisitionRequest.description.ilike(f'%{search}%'),
            )
        )

    pipeline = request.args.get('pipeline')
    if pipeline:
        query = query.filter(AcquisitionRequest.derived_pipeline == pipeline)

    fiscal_year = request.args.get('fiscal_year')
    if fiscal_year:
        query = query.filter(AcquisitionRequest.fiscal_year == fiscal_year)

    # Sort
    sort = request.args.get('sort', 'created_desc')
    if sort == 'created_asc':
        query = query.order_by(AcquisitionRequest.created_at.asc())
    elif sort == 'value_desc':
        query = query.order_by(AcquisitionRequest.estimated_value.desc())
    elif sort == 'value_asc':
        query = query.order_by(AcquisitionRequest.estimated_value.asc())
    else:
        query = query.order_by(AcquisitionRequest.created_at.desc())

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 100)

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'requests': [r.to_dict() for r in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages,
        'per_page': per_page,
    })


@requests_bp.route('/<int:request_id>', methods=['GET'])
@jwt_required()
def get_request(request_id):
    """Get a single acquisition request by ID.
    ---
    tags:
      - Requests
    parameters:
      - name: request_id
        in: path
        type: integer
        required: true
      - name: include_relations
        in: query
        type: boolean
        required: false
        default: false
        description: Include related CLINs, documents, approvals
    responses:
      200:
        description: Acquisition request details
        schema:
          $ref: '#/definitions/AcquisitionRequest'
      404:
        description: Request not found
    """
    acq = AcquisitionRequest.query.get_or_404(request_id)
    include = request.args.get('include_relations', 'false').lower() == 'true'
    return jsonify(acq.to_dict(include_relations=include))


@requests_bp.route('', methods=['POST'])
@jwt_required()
def create_request():
    """Create a new acquisition request.
    ---
    tags:
      - Requests
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - title
          properties:
            title:
              type: string
            description:
              type: string
            estimated_value:
              type: number
              default: 0
            fiscal_year:
              type: string
            priority:
              type: string
              default: medium
              enum: [low, medium, high, critical]
            need_by_date:
              type: string
              format: date
            requestor_name:
              type: string
            requestor_org:
              type: string
            notes:
              type: string
            need_type:
              type: string
              description: Intake Q1 need type
            need_sub_type:
              type: string
              description: Intake Q2 situation or Q5 change type
            vendor_known:
              type: string
              description: Intake Q3 specific vendor
            existing_vehicle:
              type: string
              description: Intake Q4 existing vehicle
            buy_category:
              type: string
              description: Product, service, software_license, or mixed
            predominant_element:
              type: string
              description: For mixed buy categories
    responses:
      201:
        description: Request created
        schema:
          $ref: '#/definitions/AcquisitionRequest'
      400:
        description: Validation error
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    # Map need_sub_type to the correct backend column based on need_type
    need_type = data.get('need_type')
    need_sub_type = data.get('need_sub_type')
    q2_situation = need_sub_type if need_type == 'continue_extend' else None
    q5_change_type = need_sub_type if need_type == 'change_existing' else None

    acq = AcquisitionRequest(
        request_number=_generate_request_number(),
        title=title,
        description=data.get('description'),
        estimated_value=data.get('estimated_value', 0),
        fiscal_year=data.get('fiscal_year', datetime.utcnow().strftime('%Y')),
        priority=data.get('priority', 'medium'),
        need_by_date=data.get('need_by_date'),
        status='draft',
        requestor_id=int(user_id),
        requestor_name=data.get('requestor_name'),
        requestor_org=data.get('requestor_org'),
        notes=data.get('notes'),
        # Intake answers from guided wizard
        intake_q1_need_type=need_type,
        intake_q2_situation=q2_situation,
        intake_q3_specific_vendor=data.get('vendor_known'),
        intake_q4_existing_vehicle=data.get('existing_vehicle'),
        intake_q5_change_type=q5_change_type,
        intake_q_buy_category=data.get('buy_category'),
        intake_q_mixed_predominant=data.get('predominant_element'),
        existing_contract_number=data.get('existing_contract_number'),
        existing_contract_vendor=data.get('existing_contractor_name'),
        existing_contract_end_date=data.get('existing_contract_end'),
    )
    db.session.add(acq)

    log = ActivityLog(
        request_id=None,  # will be set after flush
        activity_type='created',
        description=f'Request "{title}" created',
        actor=data.get('requestor_name', 'Unknown'),
    )
    db.session.flush()
    log.request_id = acq.id
    db.session.add(log)
    db.session.commit()

    return jsonify(acq.to_dict()), 201


@requests_bp.route('/<int:request_id>', methods=['PUT'])
@jwt_required()
def update_request(request_id):
    """Update an existing acquisition request.
    ---
    tags:
      - Requests
    parameters:
      - name: request_id
        in: path
        type: integer
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
            description:
              type: string
            estimated_value:
              type: number
            fiscal_year:
              type: string
            priority:
              type: string
            need_by_date:
              type: string
              format: date
            notes:
              type: string
            requestor_name:
              type: string
            requestor_org:
              type: string
            awarded_date:
              type: string
              format: date
            awarded_vendor:
              type: string
            awarded_amount:
              type: number
            po_number:
              type: string
    responses:
      200:
        description: Updated request
        schema:
          $ref: '#/definitions/AcquisitionRequest'
      400:
        description: No data provided
      404:
        description: Request not found
    """
    acq = AcquisitionRequest.query.get_or_404(request_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Updatable fields
    updatable = [
        'title', 'description', 'estimated_value', 'fiscal_year', 'priority',
        'need_by_date', 'notes', 'requestor_name', 'requestor_org',
        'existing_contract_number', 'existing_contract_vendor', 'existing_contract_value',
        'existing_contract_end_date', 'existing_contract_vehicle',
        'options_remaining', 'current_option_year', 'cpars_rating',
        'awarded_date', 'awarded_vendor', 'awarded_amount', 'po_number',
    ]

    for field in updatable:
        if field in data:
            setattr(acq, field, data[field])

    acq.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(acq.to_dict())


@requests_bp.route('/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_request(request_id):
    """Delete an acquisition request. Admins can delete any; requestors can delete own drafts.
    ---
    tags:
      - Requests
    parameters:
      - name: request_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Request deleted
        schema:
          type: object
          properties:
            success:
              type: boolean
            message:
              type: string
      403:
        description: Permission denied
      404:
        description: Request not found
    """
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role', '')

    acq = AcquisitionRequest.query.get_or_404(request_id)

    # Admins can delete any request
    if role == 'admin':
        pass
    # Requestors can delete their own drafts
    elif acq.requestor_id == user_id and acq.status == 'draft':
        pass
    else:
        return jsonify({'error': 'Only admins can delete requests, or requestors can delete their own drafts'}), 403

    title = acq.title
    req_num = acq.request_number

    # Cascade deletes handle related records (CLINs, docs, approvals, advisories, activity logs)
    db.session.delete(acq)
    db.session.commit()

    return jsonify({'success': True, 'message': f'Request {req_num} "{title}" deleted'})


@requests_bp.route('/<int:request_id>/submit', methods=['POST'])
@jwt_required()
def submit(request_id):
    """Submit an acquisition request into the approval pipeline.
    ---
    tags:
      - Requests
    parameters:
      - name: request_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Request submitted successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
            request:
              $ref: '#/definitions/AcquisitionRequest'
      400:
        description: Cannot submit (validation error or wrong status)
    """
    result = workflow_submit(request_id)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)
