"""
Document Checklist Engine — evaluates DocumentRule conditions against
request fields and creates/updates PackageDocument records.
"""

import json
from datetime import datetime
from app.extensions import db
from app.models.document import DocumentTemplate, DocumentRule, PackageDocument


def generate_checklist(request):
    """
    Evaluate all DocumentRule conditions against request fields.
    Create PackageDocument records for required templates.

    Args:
        request: AcquisitionRequest instance

    Returns:
        list of created PackageDocument dicts
    """
    created = []
    templates = DocumentTemplate.query.all()

    for template in templates:
        rules = DocumentRule.query.filter_by(document_template_id=template.id).order_by(
            DocumentRule.priority.desc()
        ).all()

        is_required = False
        applicability = 'not_required'

        for rule in rules:
            if _evaluate_conditions(rule.conditions, request):
                is_required = True
                applicability = rule.applicability
                break  # highest priority matching rule wins

        # Check if document already exists for this request+template
        existing = PackageDocument.query.filter_by(
            request_id=request.id,
            document_template_id=template.id,
        ).first()

        if existing:
            # Update existing
            existing.is_required = is_required
            existing.status = 'not_started' if is_required else 'not_required'
        else:
            doc = PackageDocument(
                request_id=request.id,
                document_template_id=template.id,
                document_type=template.doc_type_key,
                title=template.name,
                status='not_started' if is_required else 'not_required',
                required_before_gate=template.required_before_gate,
                is_required=is_required,
                was_required=False,
            )
            db.session.add(doc)
            created.append({
                'doc_type_key': template.doc_type_key,
                'name': template.name,
                'is_required': is_required,
                'applicability': applicability,
                'required_before_gate': template.required_before_gate,
            })

    db.session.commit()
    return created


def recalculate_checklist(request):
    """
    "Oops" design: re-evaluate conditions after request changes.
    Mark is_required/was_required and return diff of what changed.

    Returns:
        dict with added, removed, unchanged lists
    """
    diff = {'added': [], 'removed': [], 'unchanged': []}
    templates = DocumentTemplate.query.all()

    for template in templates:
        rules = DocumentRule.query.filter_by(document_template_id=template.id).order_by(
            DocumentRule.priority.desc()
        ).all()

        now_required = False
        for rule in rules:
            if _evaluate_conditions(rule.conditions, request):
                now_required = True
                break

        existing = PackageDocument.query.filter_by(
            request_id=request.id,
            document_template_id=template.id,
        ).first()

        if existing:
            was = existing.is_required
            if was and not now_required:
                # Was required, no longer required
                existing.was_required = True
                existing.is_required = False
                if existing.status == 'not_started':
                    existing.status = 'not_required'
                diff['removed'].append({
                    'doc_type_key': template.doc_type_key,
                    'name': template.name,
                })
            elif not was and now_required:
                # Newly required
                existing.is_required = True
                existing.was_required = False
                if existing.status == 'not_required':
                    existing.status = 'not_started'
                diff['added'].append({
                    'doc_type_key': template.doc_type_key,
                    'name': template.name,
                })
            else:
                diff['unchanged'].append({
                    'doc_type_key': template.doc_type_key,
                    'name': template.name,
                    'is_required': now_required,
                })
        else:
            # Create new document record
            doc = PackageDocument(
                request_id=request.id,
                document_template_id=template.id,
                document_type=template.doc_type_key,
                title=template.name,
                status='not_started' if now_required else 'not_required',
                required_before_gate=template.required_before_gate,
                is_required=now_required,
                was_required=False,
            )
            db.session.add(doc)
            if now_required:
                diff['added'].append({
                    'doc_type_key': template.doc_type_key,
                    'name': template.name,
                })

    db.session.commit()
    return diff


def _evaluate_conditions(conditions_json, request):
    """
    Evaluate a JSON conditions string against request fields.

    Condition format:
    {
        "allOf": [
            {"field": "derived_acquisition_type", "operator": "in", "values": ["new_competitive", "recompete"]},
            {"field": "estimated_value", "operator": ">", "value": 15000}
        ]
    }

    Operators: in, not_in, ==, !=, >, <, >=, <=, exists
    """
    if not conditions_json:
        return False

    try:
        conditions = json.loads(conditions_json) if isinstance(conditions_json, str) else conditions_json
    except (json.JSONDecodeError, TypeError):
        return False

    # Handle allOf (AND logic)
    if 'allOf' in conditions:
        return all(_evaluate_single(c, request) for c in conditions['allOf'])

    # Handle anyOf (OR logic)
    if 'anyOf' in conditions:
        return any(_evaluate_single(c, request) for c in conditions['anyOf'])

    # Single condition
    return _evaluate_single(conditions, request)


def _evaluate_single(condition, request):
    """Evaluate a single condition against a request."""
    field = condition.get('field')
    operator = condition.get('operator')

    if not field or not operator:
        return False

    # Get field value from request
    field_value = _get_field_value(request, field)

    if operator == 'exists':
        return field_value is not None

    if operator == 'in':
        values = condition.get('values', [])
        return field_value in values

    if operator == 'not_in':
        values = condition.get('values', [])
        return field_value not in values

    compare_value = condition.get('value')

    if operator == '==':
        return field_value == compare_value

    if operator == '!=':
        return field_value != compare_value

    # Numeric comparisons
    try:
        fv = float(field_value) if field_value is not None else 0
        cv = float(compare_value) if compare_value is not None else 0
    except (ValueError, TypeError):
        return False

    if operator == '>':
        return fv > cv
    if operator == '<':
        return fv < cv
    if operator == '>=':
        return fv >= cv
    if operator == '<=':
        return fv <= cv

    return False


def _get_field_value(request, field):
    """Get a field value from the request object."""
    # Direct attribute access
    if hasattr(request, field):
        return getattr(request, field)

    # Fallback: try dict access if request is a dict
    if isinstance(request, dict):
        return request.get(field)

    return None
