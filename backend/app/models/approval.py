from datetime import datetime
from app.extensions import db


class ApprovalTemplate(db.Model):
    __tablename__ = 'approval_templates'

    id = db.Column(db.Integer, primary_key=True)
    template_key = db.Column(db.String(40), unique=True)  # APPR-FULL, APPR-FULL-LEGAL, etc.
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    pipeline_type = db.Column(db.String(30))  # full, abbreviated, ko_only, micro, clin_execution, etc.
    is_default = db.Column(db.Boolean, default=False)

    steps = db.relationship('ApprovalTemplateStep', backref='template', lazy='dynamic',
                            cascade='all, delete-orphan', order_by='ApprovalTemplateStep.step_number')

    def to_dict(self):
        return {
            'id': self.id,
            'template_key': self.template_key,
            'name': self.name,
            'description': self.description,
            'pipeline_type': self.pipeline_type,
            'is_default': self.is_default,
            'steps': [s.to_dict() for s in self.steps],
        }


class ApprovalTemplateStep(db.Model):
    __tablename__ = 'approval_template_steps'

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('approval_templates.id'), nullable=False)
    step_number = db.Column(db.Integer, nullable=False)
    step_name = db.Column(db.String(100), nullable=False)
    approver_role = db.Column(db.String(50), nullable=False)
    sla_days = db.Column(db.Integer, default=5)
    is_conditional = db.Column(db.Boolean, default=False)
    condition_rule = db.Column(db.Text)  # JSON conditions
    escalation_to = db.Column(db.String(100))  # Role to escalate to on timeout
    is_enabled = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'template_id': self.template_id,
            'step_number': self.step_number,
            'gate_name': self.step_name,
            'approver_role': self.approver_role,
            'sla_days': self.sla_days,
            'is_conditional': self.is_conditional,
            'escalation_to': self.escalation_to,
            'is_enabled': self.is_enabled,
        }


class ApprovalStep(db.Model):
    __tablename__ = 'approval_steps'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('acquisition_requests.id'), nullable=False)
    step_number = db.Column(db.Integer, nullable=False)
    step_name = db.Column(db.String(100), nullable=False)
    approver_role = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, active, approved, rejected, returned, skipped
    activated_at = db.Column(db.DateTime)
    due_date = db.Column(db.DateTime)
    acted_on_date = db.Column(db.DateTime)
    action_by = db.Column(db.String(200))
    action_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    comments = db.Column(db.Text)

    actor = db.relationship('User', foreign_keys=[action_by_id])

    @property
    def is_overdue(self):
        if self.status == 'active' and self.due_date:
            return datetime.utcnow() > self.due_date
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'step_number': self.step_number,
            'gate_name': self.step_name,
            'approver_role': self.approver_role,
            'status': self.status,
            'assigned_at': self.activated_at.isoformat() if self.activated_at else None,
            'decided_at': self.acted_on_date.isoformat() if self.acted_on_date else None,
            'sla_days': getattr(self, 'sla_days', 5),
            'comments': self.comments,
            'is_overdue': self.is_overdue,
        }
