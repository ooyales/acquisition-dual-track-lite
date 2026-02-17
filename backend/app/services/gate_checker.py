"""
Gate Readiness Checker — verifies that all prerequisites are met
before an approval step can proceed.

Checks:
1. Required documents before this gate are complete
2. Advisory inputs for this gate are resolved
3. At KO gate: CLINs have PSC, LOA, and severability resolved
"""

from app.models.document import PackageDocument
from app.models.advisory import AdvisoryInput
from app.models.clin import AcquisitionCLIN
from app.models.request import AcquisitionRequest


def check_gate_readiness(request_id, gate_name):
    """
    Check if all prerequisites for a specific gate are met.

    Args:
        request_id: int
        gate_name: str (iss, asr, finance, ko_review, legal, cio_approval, senior_review, award)

    Returns:
        dict with:
            - documents_ready: bool
            - advisories_ready: bool
            - clins_valid: bool (only checked at ko_review)
            - gate_ready: bool (all checks pass)
            - blockers: list of blocking items
    """
    request = AcquisitionRequest.query.get(request_id)
    if not request:
        return {
            'documents_ready': False,
            'advisories_ready': False,
            'clins_valid': False,
            'gate_ready': False,
            'blockers': ['Request not found'],
        }

    blockers = []

    # --- Check 1: Required documents before this gate ---
    documents_ready = True
    required_docs = PackageDocument.query.filter_by(
        request_id=request_id,
        required_before_gate=gate_name,
        is_required=True,
    ).all()

    for doc in required_docs:
        if doc.status not in ('complete', 'not_required'):
            documents_ready = False
            blockers.append({
                'type': 'document',
                'id': doc.id,
                'name': doc.title,
                'status': doc.status,
                'message': f'Document "{doc.title}" is {doc.status} (required before {gate_name})',
            })

    # --- Check 2: Advisory inputs resolved ---
    advisories_ready = True
    # Map gate names to advisory blocking gates
    advisory_gate_map = {
        'iss': 'iss',
        'asr': 'asr',
        'ko_review': 'ko_review',
    }

    if gate_name in advisory_gate_map:
        blocking_advisories = AdvisoryInput.query.filter_by(
            request_id=request_id,
            blocks_gate=advisory_gate_map[gate_name],
        ).filter(
            AdvisoryInput.status.in_(['requested', 'in_review'])
        ).all()

        for adv in blocking_advisories:
            advisories_ready = False
            blockers.append({
                'type': 'advisory',
                'id': adv.id,
                'team': adv.team,
                'status': adv.status,
                'message': f'{adv.team.upper()} advisory input is {adv.status} (blocks {gate_name})',
            })

    # --- Check 3: CLIN validation at KO review ---
    clins_valid = True
    if gate_name == 'ko_review':
        clins = AcquisitionCLIN.query.filter_by(request_id=request_id).all()

        if not clins and request.estimated_value and request.estimated_value > 0:
            clins_valid = False
            blockers.append({
                'type': 'clin',
                'message': 'No CLINs defined for this request',
            })

        for clin in clins:
            # Check PSC code assigned
            if not clin.psc_code_id:
                clins_valid = False
                blockers.append({
                    'type': 'clin',
                    'id': clin.id,
                    'clin_number': clin.clin_number,
                    'message': f'CLIN {clin.clin_number}: No PSC code assigned',
                })

            # Check LOA assigned
            if not clin.loa_id:
                clins_valid = False
                blockers.append({
                    'type': 'clin',
                    'id': clin.id,
                    'clin_number': clin.clin_number,
                    'message': f'CLIN {clin.clin_number}: No LOA assigned',
                })

            # Check severability resolved
            if clin.severability in (None, 'tbd'):
                clins_valid = False
                blockers.append({
                    'type': 'clin',
                    'id': clin.id,
                    'clin_number': clin.clin_number,
                    'message': f'CLIN {clin.clin_number}: Severability not resolved',
                })

        # Validate CLIN sum vs estimated value
        if clins:
            clin_total = sum(c.estimated_value or 0 for c in clins)
            if request.estimated_value and abs(clin_total - request.estimated_value) > 0.01:
                blockers.append({
                    'type': 'clin_sum',
                    'message': f'CLIN total (${clin_total:,.2f}) does not match estimated value (${request.estimated_value:,.2f})',
                    'severity': 'warning',
                })
    else:
        # Not at KO gate, CLINs always valid
        clins_valid = True

    gate_ready = documents_ready and advisories_ready and clins_valid

    return {
        'documents_ready': documents_ready,
        'advisories_ready': advisories_ready,
        'clins_valid': clins_valid,
        'gate_ready': gate_ready,
        'blockers': blockers,
        'gate_name': gate_name,
        'request_id': request_id,
    }
