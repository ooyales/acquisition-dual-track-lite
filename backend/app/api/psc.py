from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.psc import PSCCode
from app.extensions import db

psc_bp = Blueprint('psc', __name__)


@psc_bp.route('/search', methods=['GET'])
@jwt_required()
def search_psc():
    """Quick search endpoint for PSC typeahead."""
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'codes': [], 'count': 0})

    results = PSCCode.query.filter(
        PSCCode.status == 'active',
        db.or_(
            PSCCode.code.ilike(f'%{q}%'),
            PSCCode.title.ilike(f'%{q}%'),
            PSCCode.group_name.ilike(f'%{q}%'),
        )
    ).order_by(PSCCode.code).limit(20).all()

    return jsonify({
        'codes': [p.to_dict() for p in results],
        'count': len(results),
    })


@psc_bp.route('', methods=['GET'])
@jwt_required()
def list_psc():
    """List PSC codes with filters."""
    query = PSCCode.query.filter_by(status='active')

    category = request.args.get('category')
    if category:
        query = query.filter(PSCCode.category == category)

    is_it = request.args.get('is_it_related')
    if is_it is not None:
        query = query.filter(PSCCode.is_it_related == (is_it.lower() == 'true'))

    service_or_product = request.args.get('service_or_product')
    if service_or_product:
        query = query.filter(PSCCode.service_or_product == service_or_product)

    # Buy category filter: map buy_category to service_or_product
    buy_category = request.args.get('buy_category')
    if buy_category:
        if buy_category == 'product':
            query = query.filter(PSCCode.service_or_product == 'product')
        elif buy_category == 'service':
            query = query.filter(PSCCode.service_or_product == 'service')
        elif buy_category == 'software_license':
            query = query.filter(
                db.or_(
                    PSCCode.service_or_product == 'product',
                    PSCCode.group_name.ilike('%software%'),
                )
            )

    search = request.args.get('search')
    if search:
        query = query.filter(
            db.or_(
                PSCCode.code.ilike(f'%{search}%'),
                PSCCode.title.ilike(f'%{search}%'),
                PSCCode.group_name.ilike(f'%{search}%'),
            )
        )

    group = request.args.get('group')
    if group:
        query = query.filter(PSCCode.group_name == group)

    psc_codes = query.order_by(PSCCode.code).all()

    return jsonify({
        'psc_codes': [p.to_dict() for p in psc_codes],
        'count': len(psc_codes),
    })
