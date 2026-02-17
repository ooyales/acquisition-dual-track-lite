from app.extensions import db


class IntakePath(db.Model):
    """Maps guided-intake answers to derived acquisition classification.

    Each row represents a unique path through the intake wizard. The system
    matches user answers against these rows to determine acquisition type,
    pipeline template, document set, and advisory triggers.
    """
    __tablename__ = 'intake_paths'

    id = db.Column(db.Integer, primary_key=True)
    path_id = db.Column(db.String(20), unique=True, nullable=False)  # PATH-001

    # Matching conditions (answers from the wizard)
    q1_need_type = db.Column(db.String(50))       # New, Continue/Extend, Change Existing
    q2_situation = db.Column(db.String(100))       # e.g. "No specific vendor", "Option years remaining"
    q3_specific_vendor = db.Column(db.String(20))  # Yes, No, -
    buy_category = db.Column(db.String(50))        # Product, Service, Software/License, Mixed, -

    # Derived outputs
    derived_acq_type = db.Column(db.String(60), nullable=False)
    derived_pipeline = db.Column(db.String(40), nullable=False)
    doc_template_set = db.Column(db.String(50))           # e.g. DOCSET-COMP-PRODUCT
    approval_template_key = db.Column(db.String(40))      # e.g. APPR-FULL
    advisory_triggers = db.Column(db.String(200))         # Comma-separated: SCRM,SBO,CIO,508
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'path_id': self.path_id,
            'q1_need_type': self.q1_need_type,
            'q2_situation': self.q2_situation,
            'q3_specific_vendor': self.q3_specific_vendor,
            'buy_category': self.buy_category,
            'derived_acq_type': self.derived_acq_type,
            'derived_pipeline': self.derived_pipeline,
            'doc_template_set': self.doc_template_set,
            'approval_template_key': self.approval_template_key,
            'advisory_triggers': self.advisory_triggers,
            'notes': self.notes,
        }
