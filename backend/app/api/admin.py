import json
import os
import tempfile
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.extensions import db
from app.models.threshold import ThresholdConfig
from app.models.approval import ApprovalTemplate, ApprovalTemplateStep
from app.models.document import DocumentTemplate, DocumentRule
from app.models.user import User
from app.models.intake_path import IntakePath
from app.models.advisory_trigger import AdvisoryTriggerRule

admin_bp = Blueprint('admin', __name__)


def _require_admin():
    claims = get_jwt()
    role = claims.get('role', '')
    if role not in ('admin', 'ko'):
        return jsonify({'error': 'Admin access required'}), 403
    return None


@admin_bp.route('/thresholds', methods=['GET'])
@jwt_required()
def list_thresholds():
    """List all threshold configurations."""
    thresholds = ThresholdConfig.query.all()
    return jsonify({
        'thresholds': [t.to_dict() for t in thresholds],
    })


@admin_bp.route('/thresholds/<int:threshold_id>', methods=['PUT'])
@jwt_required()
def update_threshold(threshold_id):
    """Update a threshold configuration."""
    err = _require_admin()
    if err:
        return err

    threshold = ThresholdConfig.query.get_or_404(threshold_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'dollar_limit' in data:
        threshold.dollar_limit = data['dollar_limit']
    if 'effective_date' in data:
        threshold.effective_date = data['effective_date']
    if 'end_date' in data:
        threshold.end_date = data['end_date']
    if 'far_reference' in data:
        threshold.far_reference = data['far_reference']
    if 'description' in data:
        threshold.description = data['description']

    db.session.commit()
    return jsonify(threshold.to_dict())


@admin_bp.route('/templates', methods=['GET'])
@jwt_required()
def list_templates():
    """List approval templates."""
    templates = ApprovalTemplate.query.all()
    return jsonify({
        'templates': [t.to_dict() for t in templates],
    })


@admin_bp.route('/templates/<int:template_id>/steps', methods=['PUT'])
@jwt_required()
def update_template_steps(template_id):
    """Bulk update steps for an approval template (toggle, reorder, SLA)."""
    err = _require_admin()
    if err:
        return err

    template = ApprovalTemplate.query.get_or_404(template_id)
    data = request.get_json()
    if not data or 'steps' not in data:
        return jsonify({'error': 'No steps data provided'}), 400

    steps_data = data['steps']

    # Build lookup of existing steps
    existing_steps = {s.id: s for s in ApprovalTemplateStep.query.filter_by(
        template_id=template_id).all()}
    seen_ids = set()

    for i, sd in enumerate(steps_data):
        step_id = sd.get('id')
        if step_id and step_id in existing_steps:
            # Update existing step
            step = existing_steps[step_id]
            step.step_number = i + 1
            step.is_enabled = sd.get('is_enabled', True)
            step.sla_days = sd.get('sla_days', step.sla_days)
            seen_ids.add(step_id)
        else:
            # New step added from catalog
            step = ApprovalTemplateStep(
                template_id=template_id,
                step_number=i + 1,
                step_name=sd.get('gate_name', ''),
                approver_role=sd.get('approver_role', ''),
                sla_days=sd.get('sla_days', 5),
                is_enabled=sd.get('is_enabled', True),
            )
            db.session.add(step)

    # Remove steps not in submission (admin deleted them)
    for sid, step in existing_steps.items():
        if sid not in seen_ids:
            db.session.delete(step)

    db.session.commit()

    # Return updated template
    template = ApprovalTemplate.query.get(template_id)
    return jsonify(template.to_dict())


GATE_CATALOG = [
    {'gate_name': 'ISS Review', 'approver_role': 'branch_chief', 'default_sla': 5},
    {'gate_name': 'ASR Review', 'approver_role': 'branch_chief', 'default_sla': 7},
    {'gate_name': 'Finance Review', 'approver_role': 'budget', 'default_sla': 5},
    {'gate_name': 'KO Review', 'approver_role': 'ko', 'default_sla': 7},
    {'gate_name': 'Legal Review', 'approver_role': 'legal', 'default_sla': 5},
    {'gate_name': 'CIO Approval', 'approver_role': 'cio', 'default_sla': 5},
    {'gate_name': 'Senior Leadership', 'approver_role': 'branch_chief', 'default_sla': 7},
    {'gate_name': 'PM Approval', 'approver_role': 'branch_chief', 'default_sla': 3},
    {'gate_name': 'CTO Approval', 'approver_role': 'cto', 'default_sla': 3},
    {'gate_name': 'COR Authorization', 'approver_role': 'ko', 'default_sla': 3},
    {'gate_name': 'COR Confirmation', 'approver_role': 'branch_chief', 'default_sla': 3},
    {'gate_name': 'COR + PM Justification', 'approver_role': 'branch_chief', 'default_sla': 3},
    {'gate_name': 'KO Execution', 'approver_role': 'ko', 'default_sla': 5},
    {'gate_name': 'KO Action', 'approver_role': 'ko', 'default_sla': 5},
    {'gate_name': 'KO Determination', 'approver_role': 'ko', 'default_sla': 5},
    {'gate_name': 'KO Contract Mod', 'approver_role': 'ko', 'default_sla': 5},
    {'gate_name': 'FM Funding Identification', 'approver_role': 'budget', 'default_sla': 5},
    {'gate_name': 'BM LOA Confirmation', 'approver_role': 'budget', 'default_sla': 5},
    {'gate_name': 'Supervisor', 'approver_role': 'branch_chief', 'default_sla': 2},
    {'gate_name': 'GPC Holder', 'approver_role': 'budget', 'default_sla': 2},
]


@admin_bp.route('/gate-catalog', methods=['GET'])
@jwt_required()
def gate_catalog():
    """Return catalog of available gate types for template configuration."""
    return jsonify({'catalog': GATE_CATALOG})


@admin_bp.route('/document-templates', methods=['GET'])
@jwt_required()
def list_document_templates():
    """List document templates."""
    templates = DocumentTemplate.query.order_by(DocumentTemplate.sort_order).all()
    return jsonify({
        'templates': [t.to_dict() for t in templates],
    })


@admin_bp.route('/document-rules', methods=['GET'])
@jwt_required()
def list_document_rules():
    """List document rules."""
    template_id = request.args.get('template_id', type=int)
    query = DocumentRule.query

    if template_id:
        query = query.filter_by(document_template_id=template_id)

    rules = query.order_by(DocumentRule.document_template_id, DocumentRule.priority.desc()).all()

    # Enrich with template info
    items = []
    for rule in rules:
        d = rule.to_dict()
        if rule.template:
            d['template_name'] = rule.template.name
            d['template_key'] = rule.template.doc_type_key
        items.append(d)

    return jsonify({
        'rules': items,
        'count': len(items),
    })


@admin_bp.route('/document-rules', methods=['POST'])
@jwt_required()
def create_document_rule():
    """Create a new document rule."""
    err = _require_admin()
    if err:
        return err

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conditions = data.get('conditions')
    if isinstance(conditions, dict):
        conditions = json.dumps(conditions)

    rule = DocumentRule(
        document_template_id=data.get('document_template_id'),
        conditions=conditions,
        applicability=data.get('applicability', 'required'),
        priority=data.get('priority', 0),
    )
    db.session.add(rule)
    db.session.commit()

    return jsonify(rule.to_dict()), 201


@admin_bp.route('/document-rules/<int:rule_id>', methods=['PUT'])
@jwt_required()
def update_document_rule(rule_id):
    """Update a document rule."""
    err = _require_admin()
    if err:
        return err

    rule = DocumentRule.query.get_or_404(rule_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'conditions' in data:
        conditions = data['conditions']
        if isinstance(conditions, dict):
            conditions = json.dumps(conditions)
        rule.conditions = conditions

    if 'applicability' in data:
        rule.applicability = data['applicability']
    if 'priority' in data:
        rule.priority = data['priority']

    db.session.commit()
    return jsonify(rule.to_dict())


@admin_bp.route('/document-rules/<int:rule_id>', methods=['DELETE'])
@jwt_required()
def delete_document_rule(rule_id):
    """Delete a document rule."""
    err = _require_admin()
    if err:
        return err

    rule = DocumentRule.query.get_or_404(rule_id)
    db.session.delete(rule)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Rule deleted'})


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """List all users."""
    users = User.query.order_by(User.name).all()
    return jsonify({
        'users': [u.to_dict() for u in users],
        'count': len(users),
    })


# ---------------------------------------------------------------------------
# Intake Paths
# ---------------------------------------------------------------------------

@admin_bp.route('/intake-paths', methods=['GET'])
@jwt_required()
def list_intake_paths():
    """List all intake paths (from Excel import)."""
    paths = IntakePath.query.order_by(IntakePath.path_id).all()
    return jsonify({
        'paths': [p.to_dict() for p in paths],
        'count': len(paths),
    })


# ---------------------------------------------------------------------------
# Advisory Trigger Rules
# ---------------------------------------------------------------------------

@admin_bp.route('/advisory-triggers', methods=['GET'])
@jwt_required()
def list_advisory_triggers():
    """List all advisory trigger rules."""
    triggers = AdvisoryTriggerRule.query.order_by(AdvisoryTriggerRule.trigger_id).all()
    return jsonify({
        'triggers': [t.to_dict() for t in triggers],
        'count': len(triggers),
    })


# ---------------------------------------------------------------------------
# Excel Rules Import
# ---------------------------------------------------------------------------

@admin_bp.route('/import-rules', methods=['POST'])
@jwt_required()
def import_rules():
    """Upload and import Excel rules workbook."""
    err = _require_admin()
    if err:
        return err

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename or not file.filename.endswith('.xlsx'):
        return jsonify({'error': 'File must be an .xlsx workbook'}), 400

    # Save to temp file and import
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        from app.services.excel_importer import import_all
        result = import_all(tmp_path)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    finally:
        os.unlink(tmp_path)
