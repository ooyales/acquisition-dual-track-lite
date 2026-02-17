"""
Intake Derivation Engine — data-driven acquisition classification.

Reads from the IntakePath table (imported from the Intake Paths sheet of
acquisition-rules-config.xlsx) to match user answers and derive:
- acquisition_type
- tier
- pipeline
- contract_character
- requirements_doc_type
- scls_applicable
- qasp_required
- eval_approach

Also returns the matched path's approval_template_key, doc_template_set,
and advisory_triggers for downstream use.
"""

from app.models.threshold import ThresholdConfig
from app.models.intake_path import IntakePath


# Maps Excel Q2 situation text → normalized keys used in the wizard
Q2_NORMALIZE = {
    'no specific vendor': 'no_specific_vendor',
    'specific vendor required': 'specific_vendor',
    'option years remaining': 'options_remaining',
    'expiring, want same contractor': 'expiring_same_vendor',
    'expiring, should compete': 'expiring_compete',
    'need bridge for re-compete': 'need_bridge',
    'contract expired (gap)': 'expired_gap',
    'odc clin execution': 'odc_clin',
    'travel clin execution': 'travel_clin',
    'odc clin — insufficient funds': 'odc_clin_insufficient',
    'add scope / increase funding': 'add_scope',
    'admin correction': 'admin_correction',
    'move $ between clins': 'clin_reallocation',
}


def derive_classification(request_data):
    """
    Main derivation function. Matches intake answers against the IntakePath
    table and returns derived classification fields.

    Expected keys in request_data:
      - intake_q1_need_type: new | continue_extend | change_existing
      - intake_q2_situation: (various sub-type values)
      - intake_q3_specific_vendor: yes | no | not_sure
      - intake_q5_change_type: add_scope | admin_correction | clin_reallocation | descope
      - intake_q_buy_category: product | service | software_license | mixed
      - intake_q_mixed_predominant: predominantly_product | predominantly_service | roughly_equal
      - estimated_value: float
    """
    q1 = request_data.get('intake_q1_need_type')
    q2 = request_data.get('intake_q2_situation')
    q3 = request_data.get('intake_q3_specific_vendor')
    q5 = request_data.get('intake_q5_change_type')
    buy_category = request_data.get('intake_q_buy_category')
    mixed_predominant = request_data.get('intake_q_mixed_predominant')
    estimated_value = float(request_data.get('estimated_value', 0) or 0)

    # Derive tier from configurable thresholds
    tier = _derive_tier(estimated_value)

    # Match against IntakePath table
    path = _match_intake_path(q1, q2, q3, q5, buy_category)

    if path:
        acquisition_type = path.derived_acq_type
        pipeline = path.derived_pipeline
        approval_template_key = path.approval_template_key
        doc_template_set = path.doc_template_set
        advisory_triggers = path.advisory_triggers
    else:
        # Fallback if no path matches
        acquisition_type = _derive_acquisition_type_fallback(q1, q2, q3, q5)
        pipeline = _derive_pipeline_fallback(acquisition_type, tier)
        approval_template_key = None
        doc_template_set = None
        advisory_triggers = None

    # Second-order derivations (computed from buy_category + tier, not in Excel)
    contract_character = _derive_contract_character(buy_category, mixed_predominant)
    requirements_doc_type = _derive_requirements_doc_type(contract_character, buy_category)
    scls_applicable = contract_character in ('service', 'mixed_service')
    qasp_required = (
        contract_character in ('service', 'mixed_service') and
        tier in ('sat', 'above_sat', 'major')
    )
    eval_approach = _derive_eval_approach(contract_character, buy_category)

    urgency_flag = q1 == 'continue_extend' and q2 == 'expired_gap'
    market_research_pending = q1 == 'new' and q3 == 'not_sure'

    return {
        'derived_acquisition_type': acquisition_type,
        'derived_tier': tier,
        'derived_pipeline': pipeline,
        'derived_contract_character': contract_character,
        'derived_requirements_doc_type': requirements_doc_type,
        'derived_scls_applicable': scls_applicable,
        'derived_qasp_required': qasp_required,
        'derived_eval_approach': eval_approach,
        'urgency_flag': urgency_flag,
        'market_research_pending': market_research_pending,
        # Path metadata for downstream use
        'approval_template_key': approval_template_key,
        'doc_template_set': doc_template_set,
        'advisory_triggers': advisory_triggers,
        'matched_path_id': path.path_id if path else None,
    }


def _match_intake_path(q1, q2, q3, q5, buy_category):
    """
    Match user answers against IntakePath rows.

    Uses a scoring system: each matching non-wildcard field adds a point.
    The path with the highest score wins (most specific match).
    """
    try:
        paths = IntakePath.query.all()
    except Exception:
        return None

    if not paths:
        return None

    # Normalize q1 to match path data
    q1_map = {
        'new': 'new',
        'continue_extend': 'continue_extend',
        'change_existing': 'change_existing',
    }
    q1_norm = q1_map.get(q1, q1) if q1 else None

    # Build effective q2: for change_existing, q2 comes from q5
    effective_q2 = q2
    if q1 == 'change_existing' and q5:
        effective_q2 = q5

    # Normalize buy_category for matching
    buy_cat_map = {
        'software_license': 'software_license',
        'product': 'product',
        'service': 'service',
        'mixed': 'mixed',
    }
    buy_cat_norm = buy_cat_map.get(buy_category, buy_category) if buy_category else None

    # Normalize q3 for matching
    q3_map = {
        'yes': 'Yes',
        'yes_sole': 'Yes',
        'yes_limited': 'No',
        'no': 'No',
        'not_sure': 'No',
    }
    q3_norm = q3_map.get(q3, q3) if q3 else None

    best_match = None
    best_score = -1

    for path in paths:
        score = 0
        match = True

        # Q1 must match
        if path.q1_need_type:
            if path.q1_need_type != q1_norm:
                match = False
                continue
            score += 1

        # Q2 situation matching
        if path.q2_situation and path.q2_situation.strip() not in ('-', ''):
            # Normalize the path's Q2 to compare with the wizard's Q2
            path_q2_norm = Q2_NORMALIZE.get(path.q2_situation.lower(), path.q2_situation.lower())
            if effective_q2 and effective_q2.lower() != path_q2_norm and effective_q2 != path.q2_situation:
                match = False
                continue
            if effective_q2:
                score += 2  # Q2 is a strong discriminator

        # Q3 specific vendor matching
        if path.q3_specific_vendor and path.q3_specific_vendor.strip() not in ('-', ''):
            if q3_norm and q3_norm != path.q3_specific_vendor:
                match = False
                continue
            if q3_norm:
                score += 1

        # Buy category matching
        if path.buy_category and path.buy_category.strip() not in ('-', '', None):
            if buy_cat_norm and buy_cat_norm != path.buy_category:
                match = False
                continue
            if buy_cat_norm:
                score += 1

        if match and score > best_score:
            best_score = score
            best_match = path

    return best_match


def _derive_tier(estimated_value):
    """Determine tier from configurable thresholds."""
    thresholds = _get_thresholds()
    micro_limit = thresholds.get('micro_purchase', 15000)
    sat_limit = thresholds.get('simplified_acquisition', 350000)
    above_sat_limit = thresholds.get('above_sat', 9000000)

    if estimated_value <= micro_limit:
        return 'micro'
    elif estimated_value <= sat_limit:
        return 'sat'
    elif estimated_value <= above_sat_limit:
        return 'above_sat'
    else:
        return 'major'


def _get_thresholds():
    """Load thresholds from DB, with defaults fallback."""
    try:
        configs = ThresholdConfig.query.all()
        result = {}
        for c in configs:
            # Map various name formats to the expected keys
            name = c.name.lower()
            if 'micro' in name:
                result['micro_purchase'] = c.dollar_limit
            elif 'simplified' in name or name == 'simplified_acquisition':
                result['simplified_acquisition'] = c.dollar_limit
            elif 'above_sat' in name:
                result['above_sat'] = c.dollar_limit
            elif 'ja_ko' in name or name == 'ja_threshold':
                result['ja_threshold'] = c.dollar_limit
            else:
                result[c.name] = c.dollar_limit
        return result
    except Exception:
        return {
            'micro_purchase': 15000,
            'simplified_acquisition': 350000,
            'above_sat': 9000000,
            'ja_threshold': 900000,
        }


# ---------------------------------------------------------------------------
# Fallback derivation (used when no IntakePath match found)
# ---------------------------------------------------------------------------

def _derive_acquisition_type_fallback(q1, q2, q3, q5):
    """Legacy decision tree — used as fallback if IntakePath table is empty."""
    if q1 == 'new':
        if q3 == 'yes' or q3 == 'yes_sole':
            return 'brand_name'
        return 'new_competitive'
    elif q1 == 'continue_extend':
        if q2 == 'options_remaining':
            return 'option_exercise'
        elif q2 == 'expiring_same_vendor':
            return 'follow_on_sole_source'
        elif q2 == 'expiring_compete':
            return 'recompete'
        elif q2 == 'need_bridge':
            return 'bridge_extension'
        elif q2 == 'expired_gap':
            return 'new_competitive_urgency'
        return 'option_exercise'
    elif q1 == 'change_existing':
        if q5 == 'add_scope':
            return 'bilateral_mod'
        elif q5 == 'admin_correction':
            return 'unilateral_mod'
        elif q5 == 'clin_reallocation':
            return 'clin_reallocation'
        return 'bilateral_mod'
    return 'new_competitive'


def _derive_pipeline_fallback(acquisition_type, tier):
    """Legacy pipeline derivation — fallback."""
    if tier == 'micro':
        return 'micro'
    if acquisition_type in ('option_exercise', 'bridge_extension'):
        return 'abbreviated'
    if acquisition_type in ('unilateral_mod', 'clin_reallocation'):
        return 'ko_only'
    if tier == 'sat':
        return 'abbreviated'
    if tier in ('above_sat', 'major'):
        return 'full'
    return 'abbreviated'


# ---------------------------------------------------------------------------
# Second-order derivations (always computed, not in Excel paths)
# ---------------------------------------------------------------------------

def _derive_contract_character(buy_category, mixed_predominant):
    """Determine contract character from buy category."""
    if buy_category == 'product':
        return 'product'
    elif buy_category == 'service':
        return 'service'
    elif buy_category == 'software_license':
        return 'product'
    elif buy_category == 'mixed':
        if mixed_predominant == 'predominantly_product':
            return 'mixed_product'
        return 'mixed_service'
    return 'service'


def _derive_requirements_doc_type(contract_character, buy_category):
    """Determine requirements document type."""
    if buy_category == 'software_license':
        return 'description'
    if contract_character == 'product':
        return 'specification'
    elif contract_character in ('service', 'mixed_service'):
        return 'pws'
    elif contract_character == 'mixed_product':
        return 'specification'
    return 'pws'


def _derive_eval_approach(contract_character, buy_category):
    """Determine evaluation approach."""
    if contract_character == 'product' or buy_category == 'software_license':
        return 'lpta'
    return 'best_value'
