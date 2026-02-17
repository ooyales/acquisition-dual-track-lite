from datetime import datetime
from app.extensions import db


class DocumentTemplate(db.Model):
    __tablename__ = 'document_templates'

    id = db.Column(db.Integer, primary_key=True)
    doc_type_key = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(30))  # pre_award, award, post_award, administrative
    required_before_gate = db.Column(db.String(30))  # iss, asr, finance, ko_review, award
    sort_order = db.Column(db.Integer, default=0)
    ai_assistable = db.Column(db.Boolean, default=False)

    rules = db.relationship('DocumentRule', backref='template', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'doc_type_key': self.doc_type_key,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'required_before_gate': self.required_before_gate,
            'sort_order': self.sort_order,
            'ai_assistable': self.ai_assistable,
        }


class DocumentRule(db.Model):
    __tablename__ = 'document_rules'

    id = db.Column(db.Integer, primary_key=True)
    document_template_id = db.Column(db.Integer, db.ForeignKey('document_templates.id'), nullable=False)
    conditions = db.Column(db.Text, nullable=False)  # JSON-encoded rule
    applicability = db.Column(db.String(20), default='required')  # required, conditional, recommended, not_required
    priority = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'document_template_id': self.document_template_id,
            'conditions': self.conditions,
            'applicability': self.applicability,
            'priority': self.priority,
        }


class PackageDocument(db.Model):
    __tablename__ = 'package_documents'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('acquisition_requests.id'), nullable=False)
    document_template_id = db.Column(db.Integer, db.ForeignKey('document_templates.id'))
    document_type = db.Column(db.String(50))
    title = db.Column(db.String(300))
    status = db.Column(db.String(30), default='not_started')  # not_started, in_progress, complete, not_required
    assigned_to = db.Column(db.String(200))
    due_date = db.Column(db.String(10))
    completed_date = db.Column(db.String(10))
    required_before_gate = db.Column(db.String(30))
    is_required = db.Column(db.Boolean, default=True)
    was_required = db.Column(db.Boolean, default=False)  # For "oops" design
    content = db.Column(db.Text)  # For AI-generated drafts
    ai_generated = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    template = db.relationship('DocumentTemplate', foreign_keys=[document_template_id])

    def to_dict(self):
        d = {
            'id': self.id,
            'request_id': self.request_id,
            'template_id': self.document_template_id,
            'status': self.status,
            'is_required': self.is_required,
            'was_required': self.was_required,
            'content': self.content,
            'notes': self.notes,
        }
        if self.template:
            d['template'] = {
                'id': self.template.id,
                'name': self.template.name,
                'doc_type': self.template.doc_type_key if hasattr(self.template, 'doc_type_key') else self.document_type,
                'category': self.template.category if hasattr(self.template, 'category') else None,
                'required_before_gate': self.template.required_before_gate if hasattr(self.template, 'required_before_gate') else self.required_before_gate,
                'ai_assistable': self.template.ai_assistable,
            }
        else:
            d['template'] = None
        return d
