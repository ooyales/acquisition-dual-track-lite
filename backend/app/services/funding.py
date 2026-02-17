"""
Funding / LOA Balance Service — manages line of accounting balance checks
and committed amount recalculations.
"""

from app.extensions import db
from app.models.loa import LineOfAccounting
from app.models.clin import AcquisitionCLIN


def check_clin_balance(clin_id, amount):
    """
    Check if a CLIN has sufficient balance for a given amount.

    Args:
        clin_id: int
        amount: float

    Returns:
        dict with sufficient, available, shortfall
    """
    clin = AcquisitionCLIN.query.get(clin_id)
    if not clin:
        return {
            'sufficient': False,
            'available': 0,
            'shortfall': amount,
            'error': 'CLIN not found',
        }

    available = clin.clin_available
    sufficient = available >= amount
    shortfall = max(0, amount - available)

    return {
        'sufficient': sufficient,
        'available': available,
        'shortfall': shortfall,
        'clin_number': clin.clin_number,
        'clin_ceiling': clin.clin_ceiling,
        'clin_obligated': clin.clin_obligated,
        'clin_invoiced': clin.clin_invoiced,
        'clin_pending': clin.clin_pending,
    }


def update_loa_committed(loa_id):
    """
    Recalculate the committed amount for an LOA from active CLIN assignments.

    Args:
        loa_id: int

    Returns:
        dict with updated LOA balance info
    """
    loa = LineOfAccounting.query.get(loa_id)
    if not loa:
        return {'error': 'LOA not found'}

    # Sum estimated values from all CLINs assigned to this LOA
    clins = AcquisitionCLIN.query.filter_by(loa_id=loa_id).all()
    total_committed = sum(c.estimated_value or 0 for c in clins)

    loa.committed_amount = total_committed

    # Update LOA status based on balance
    available = loa.total_allocation - loa.projected_amount - loa.committed_amount - loa.obligated_amount
    if available <= 0:
        loa.status = 'exhausted'
    elif available < (loa.total_allocation * 0.1):
        loa.status = 'low_balance'
    else:
        loa.status = 'active'

    db.session.commit()

    return {
        'loa_id': loa.id,
        'display_name': loa.display_name,
        'total_allocation': loa.total_allocation,
        'committed_amount': loa.committed_amount,
        'projected_amount': loa.projected_amount,
        'obligated_amount': loa.obligated_amount,
        'available_balance': loa.available_balance,
        'status': loa.status,
    }


def check_loa_balance(loa_id, amount):
    """
    Check if an LOA has sufficient available balance.

    Args:
        loa_id: int
        amount: float

    Returns:
        dict with sufficient, available, shortfall
    """
    loa = LineOfAccounting.query.get(loa_id)
    if not loa:
        return {
            'sufficient': False,
            'available': 0,
            'shortfall': amount,
            'error': 'LOA not found',
        }

    available = loa.available_balance
    sufficient = available >= amount
    shortfall = max(0, amount - available)

    return {
        'sufficient': sufficient,
        'available': available,
        'shortfall': shortfall,
        'display_name': loa.display_name,
        'total_allocation': loa.total_allocation,
        'status': loa.status,
    }
