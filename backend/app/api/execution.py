from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.execution import CLINExecutionRequest
from app.models.request import AcquisitionRequest
from app.models.clin import AcquisitionCLIN
from app.services.funding import check_clin_balance

execution_bp = Blueprint('execution', __name__)


def _generate_exec_number(exec_type):
    """Generate unique execution request number."""
    prefix = 'ODC' if exec_type == 'odc' else 'TRV'
    year = datetime.utcnow().strftime('%Y')
    last = CLINExecutionRequest.query.filter(
        CLINExecutionRequest.request_number.like(f'{prefix}-{year}-%')
    ).order_by(CLINExecutionRequest.id.desc()).first()

    if last:
        try:
            seq = int(last.request_number.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1

    return f'{prefix}-{year}-{seq:04d}'


@execution_bp.route('', methods=['GET'])
@jwt_required()
def list_executions():
    """List execution requests."""
    query = CLINExecutionRequest.query

    exec_type = request.args.get('type')
    if exec_type:
        query = query.filter(CLINExecutionRequest.execution_type == exec_type)

    status = request.args.get('status')
    if status:
        query = query.filter(CLINExecutionRequest.status == status)

    contract_id = request.args.get('contract_id', type=int)
    if contract_id:
        query = query.filter(CLINExecutionRequest.contract_id == contract_id)

    executions = query.order_by(CLINExecutionRequest.requested_date.desc()).all()
    return jsonify({
        'executions': [e.to_dict() for e in executions],
        'count': len(executions),
    })


@execution_bp.route('/<int:exec_id>', methods=['GET'])
@jwt_required()
def get_execution(exec_id):
    """Get execution request detail."""
    exe = CLINExecutionRequest.query.get_or_404(exec_id)
    return jsonify(exe.to_dict())


@execution_bp.route('', methods=['POST'])
@jwt_required()
def create_execution():
    """Create a new execution request."""
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    exec_type = data.get('execution_type', 'odc')

    exe = CLINExecutionRequest(
        request_number=_generate_exec_number(exec_type),
        execution_type=exec_type,
        contract_id=data.get('contract_id'),
        clin_id=data.get('clin_id'),
        title=data.get('title', ''),
        description=data.get('description'),
        estimated_cost=data.get('estimated_cost', 0),
        requested_by_id=int(user_id),
        need_by_date=data.get('need_by_date'),
        status='draft',
    )

    # ODC fields
    if exec_type == 'odc':
        exe.odc_product_name = data.get('odc_product_name')
        exe.odc_vendor = data.get('odc_vendor')
        exe.odc_quote_number = data.get('odc_quote_number')
        exe.odc_renewal_period = data.get('odc_renewal_period')
        exe.odc_prior_year_cost = data.get('odc_prior_year_cost')

    # Travel fields
    elif exec_type == 'travel':
        for field in [
            'travel_traveler_name', 'travel_traveler_org', 'travel_destination',
            'travel_purpose', 'travel_departure_date', 'travel_return_date',
            'travel_airfare', 'travel_lodging', 'travel_per_diem',
            'travel_rental_car', 'travel_other_costs', 'travel_conference_event',
        ]:
            if field in data:
                setattr(exe, field, data[field])

    db.session.add(exe)
    db.session.commit()

    return jsonify(exe.to_dict()), 201


@execution_bp.route('/<int:exec_id>', methods=['PUT'])
@jwt_required()
def update_execution(exec_id):
    """Update an execution request."""
    exe = CLINExecutionRequest.query.get_or_404(exec_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    general = [
        'title', 'description', 'estimated_cost', 'clin_id', 'contract_id',
        'need_by_date', 'notes',
    ]
    odc = [
        'odc_product_name', 'odc_vendor', 'odc_quote_number',
        'odc_renewal_period', 'odc_prior_year_cost',
    ]
    travel = [
        'travel_traveler_name', 'travel_traveler_org', 'travel_destination',
        'travel_purpose', 'travel_departure_date', 'travel_return_date',
        'travel_airfare', 'travel_lodging', 'travel_per_diem',
        'travel_rental_car', 'travel_other_costs', 'travel_conference_event',
    ]

    for field in general + odc + travel:
        if field in data:
            setattr(exe, field, data[field])

    db.session.commit()
    return jsonify(exe.to_dict())


@execution_bp.route('/<int:exec_id>/submit', methods=['POST'])
@jwt_required()
def submit_execution(exec_id):
    """Submit execution request with CLIN balance check."""
    exe = CLINExecutionRequest.query.get_or_404(exec_id)

    if exe.status != 'draft':
        return jsonify({'error': f'Cannot submit from status: {exe.status}'}), 400

    # Check CLIN balance if CLIN assigned
    balance_info = None
    if exe.clin_id:
        balance_info = check_clin_balance(exe.clin_id, exe.estimated_cost or 0)
        exe.funding_status = 'sufficient' if balance_info['sufficient'] else 'insufficient'

        if not balance_info['sufficient']:
            exe.funding_action_required = True
            exe.funding_action_amount = balance_info['shortfall']
    else:
        exe.funding_status = 'sufficient'

    exe.status = 'submitted'
    exe.pm_approval = 'pending'
    db.session.commit()

    return jsonify({
        'success': True,
        'execution': exe.to_dict(),
        'funding': balance_info,
    })


@execution_bp.route('/<int:exec_id>/approve', methods=['POST'])
@jwt_required()
def approve_execution(exec_id):
    """PM or CTO approval action."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    exe = CLINExecutionRequest.query.get_or_404(exec_id)
    data = request.get_json() or {}

    action = data.get('action', 'approve')
    role = claims.get('role', '')
    comments = data.get('comments')

    now = datetime.utcnow()

    if role in ('branch_chief', 'admin') and exe.pm_approval == 'pending':
        # PM approval
        if action == 'approve':
            exe.pm_approval = 'approved'
            exe.pm_approved_by_id = int(user_id)
            exe.pm_approved_date = now
            exe.pm_comments = comments
            exe.status = 'pm_approved'
            exe.cto_approval = 'pending'
        elif action == 'reject':
            exe.pm_approval = 'rejected'
            exe.pm_comments = comments
            exe.status = 'rejected'
        elif action == 'return':
            exe.pm_approval = 'returned'
            exe.pm_comments = comments
            exe.status = 'draft'

    elif role in ('cto', 'admin') and exe.cto_approval == 'pending':
        # CTO approval
        if action == 'approve':
            exe.cto_approval = 'approved'
            exe.cto_approved_by_id = int(user_id)
            exe.cto_approved_date = now
            exe.cto_comments = comments

            if exe.funding_action_required:
                exe.status = 'funding_action_required'
            else:
                exe.status = 'authorized'
        elif action == 'reject':
            exe.cto_approval = 'rejected'
            exe.cto_comments = comments
            exe.status = 'rejected'
        elif action == 'return':
            exe.cto_approval = 'returned'
            exe.cto_comments = comments
            exe.status = 'pm_approved'
    else:
        return jsonify({'error': 'No pending approval for your role'}), 400

    db.session.commit()
    return jsonify({
        'success': True,
        'execution': exe.to_dict(),
    })


@execution_bp.route('/<int:exec_id>/invoice', methods=['POST'])
@jwt_required()
def record_invoice(exec_id):
    """Record invoice receipt."""
    exe = CLINExecutionRequest.query.get_or_404(exec_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    exe.invoice_number = data.get('invoice_number')
    exe.invoice_date = data.get('invoice_date')
    exe.actual_cost = data.get('actual_cost')

    if exe.execution_type == 'travel':
        for field in [
            'travel_actual_airfare', 'travel_actual_lodging', 'travel_actual_per_diem',
            'travel_actual_rental_car', 'travel_actual_other', 'travel_actual_total',
        ]:
            if field in data:
                setattr(exe, field, data[field])

    exe.status = 'invoice_received'
    db.session.commit()

    return jsonify(exe.to_dict())


@execution_bp.route('/<int:exec_id>/validate', methods=['POST'])
@jwt_required()
def validate_execution(exec_id):
    """COR validation of goods/services received."""
    user_id = get_jwt_identity()
    exe = CLINExecutionRequest.query.get_or_404(exec_id)
    data = request.get_json() or {}

    exe.cor_validated_by_id = int(user_id)
    exe.cor_validated_date = datetime.utcnow()
    exe.status = 'complete'
    exe.notes = data.get('notes', exe.notes)

    db.session.commit()
    return jsonify(exe.to_dict())


@execution_bp.route('/<int:exec_id>/request-funding', methods=['POST'])
@jwt_required()
def request_funding(exec_id):
    """Auto-create an acquisition request for incremental funding when CLIN balance is insufficient."""
    user_id = get_jwt_identity()
    exe = CLINExecutionRequest.query.get_or_404(exec_id)

    if not exe.funding_action_required:
        return jsonify({'error': 'Funding action not required for this execution'}), 400

    if exe.funding_request_id:
        return jsonify({
            'error': 'Funding request already created',
            'funding_request_id': exe.funding_request_id,
        }), 400

    # Build context from the execution request and its parent contract
    clin = AcquisitionCLIN.query.get(exe.clin_id) if exe.clin_id else None
    contract = AcquisitionRequest.query.get(exe.contract_id) if exe.contract_id else None

    shortfall = exe.funding_action_amount or exe.estimated_cost or 0
    exec_label = 'Travel' if exe.execution_type == 'travel' else 'ODC'

    # Generate request number
    year = datetime.utcnow().strftime('%Y')
    last = AcquisitionRequest.query.filter(
        AcquisitionRequest.request_number.like(f'ACQ-{year}-%')
    ).order_by(AcquisitionRequest.id.desc()).first()
    seq = 1
    if last:
        try:
            seq = int(last.request_number.split('-')[-1]) + 1
        except (ValueError, IndexError):
            pass
    req_number = f'ACQ-{year}-{seq:04d}'

    # Create the funding acquisition request pre-populated
    funding_req = AcquisitionRequest(
        request_number=req_number,
        title=f'Incremental Funding — {exec_label} CLIN {clin.clin_number if clin else ""}',
        description=(
            f'Incremental funding action for {exec_label} execution #{exe.request_number}. '
            f'CLIN {clin.clin_number if clin else "N/A"} has insufficient balance. '
            f'Shortfall: ${shortfall:,.2f}. '
            f'Original execution: {exe.title or exe.description or ""}'
        ),
        estimated_value=shortfall,
        fiscal_year=year,
        status='draft',
        requestor_id=int(user_id),
        # Pre-fill intake answers for the funding path
        intake_q1_need_type='continue_extend',
        intake_q2_situation='odc_clin_insufficient',
        intake_q3_specific_vendor='yes_sole',
        intake_q_buy_category='product' if exe.execution_type == 'odc' else 'service',
        # Carry forward existing contract info
        existing_contract_number=contract.existing_contract_number if contract else None,
        existing_contract_vendor=contract.existing_contract_vendor if contract else None,
        existing_contract_end_date=contract.existing_contract_end_date if contract else None,
        # Derived classification
        derived_acquisition_type='clin_execution_funding',
        derived_tier='sat' if shortfall < 250000 else 'above_sat',
        derived_pipeline='clin_exec_funding',
        derived_contract_character='product' if exe.execution_type == 'odc' else 'service',
        intake_completed=True,
        intake_completed_date=datetime.utcnow(),
    )

    db.session.add(funding_req)
    db.session.flush()  # Get the ID

    # Link back
    exe.funding_request_id = funding_req.id
    exe.funding_status = 'in_progress'

    db.session.commit()

    return jsonify({
        'success': True,
        'funding_request_id': funding_req.id,
        'funding_request_number': funding_req.request_number,
        'execution': exe.to_dict(),
    }), 201
