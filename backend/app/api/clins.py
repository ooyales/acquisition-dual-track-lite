from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.clin import AcquisitionCLIN
from app.models.request import AcquisitionRequest

clins_bp = Blueprint('clins', __name__)


@clins_bp.route('/request/<int:request_id>', methods=['GET'])
@jwt_required()
def list_clins(request_id):
    """Get CLINs for a request."""
    clins = AcquisitionCLIN.query.filter_by(request_id=request_id).order_by(
        AcquisitionCLIN.sort_order
    ).all()
    return jsonify({
        'clins': [c.to_dict() for c in clins],
        'count': len(clins),
    })


@clins_bp.route('', methods=['POST'])
@jwt_required()
def create_clin():
    """Create a new CLIN."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    request_id = data.get('request_id')
    if not request_id:
        return jsonify({'error': 'request_id is required'}), 400

    acq = AcquisitionRequest.query.get(request_id)
    if not acq:
        return jsonify({'error': 'Request not found'}), 404

    clin = AcquisitionCLIN(
        request_id=request_id,
        clin_number=data.get('clin_number', '0001'),
        description=data.get('description'),
        clin_type=data.get('clin_type'),
        psc_code_id=data.get('psc_code_id'),
        loa_id=data.get('loa_id'),
        estimated_value=data.get('estimated_value', 0),
        quantity=data.get('quantity'),
        unit_of_measure=data.get('unit_of_measure'),
        period_of_performance=data.get('period_of_performance'),
        contract_type=data.get('contract_type'),
        scls_applicable=data.get('scls_applicable', False),
        wage_determination_number=data.get('wage_determination_number'),
        severability=data.get('severability', 'tbd'),
        severability_basis=data.get('severability_basis'),
        sort_order=data.get('sort_order', 0),
        notes=data.get('notes'),
        clin_ceiling=data.get('clin_ceiling', 0),
        clin_obligated=data.get('clin_obligated', 0),
        clin_invoiced=data.get('clin_invoiced', 0),
    )
    db.session.add(clin)
    db.session.commit()

    return jsonify(clin.to_dict()), 201


@clins_bp.route('/<int:clin_id>', methods=['PUT'])
@jwt_required()
def update_clin(clin_id):
    """Update a CLIN."""
    clin = AcquisitionCLIN.query.get_or_404(clin_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    updatable = [
        'clin_number', 'description', 'clin_type', 'psc_code_id', 'loa_id',
        'estimated_value', 'quantity', 'unit_of_measure', 'period_of_performance',
        'contract_type', 'scls_applicable', 'wage_determination_number',
        'severability', 'severability_basis', 'sort_order', 'notes',
        'clin_ceiling', 'clin_obligated', 'clin_invoiced',
    ]

    for field in updatable:
        if field in data:
            setattr(clin, field, data[field])

    db.session.commit()
    return jsonify(clin.to_dict())


@clins_bp.route('/<int:clin_id>', methods=['DELETE'])
@jwt_required()
def delete_clin(clin_id):
    """Delete a CLIN."""
    clin = AcquisitionCLIN.query.get_or_404(clin_id)
    db.session.delete(clin)
    db.session.commit()
    return jsonify({'success': True, 'message': f'CLIN {clin.clin_number} deleted'})


@clins_bp.route('/request/<int:request_id>/summary', methods=['GET'])
@jwt_required()
def clin_summary(request_id):
    """Get CLIN summary with sum validation."""
    acq = AcquisitionRequest.query.get_or_404(request_id)
    clins = AcquisitionCLIN.query.filter_by(request_id=request_id).order_by(
        AcquisitionCLIN.sort_order
    ).all()

    total_estimated = sum(c.estimated_value or 0 for c in clins)
    total_ceiling = sum(c.clin_ceiling or 0 for c in clins)
    total_obligated = sum(c.clin_obligated or 0 for c in clins)
    total_invoiced = sum(c.clin_invoiced or 0 for c in clins)

    value_match = abs(total_estimated - (acq.estimated_value or 0)) < 0.01

    return jsonify({
        'clins': [c.to_dict() for c in clins],
        'count': len(clins),
        'total_estimated': total_estimated,
        'total_ceiling': total_ceiling,
        'total_obligated': total_obligated,
        'total_invoiced': total_invoiced,
        'request_estimated_value': acq.estimated_value,
        'value_match': value_match,
        'variance': total_estimated - (acq.estimated_value or 0),
    })
