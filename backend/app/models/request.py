from datetime import datetime
from app.extensions import db


class AcquisitionRequest(db.Model):
    __tablename__ = 'acquisition_requests'

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    estimated_value = db.Column(db.Float, default=0)
    fiscal_year = db.Column(db.String(4))
    priority = db.Column(db.String(20), default='medium')  # critical, high, medium, low
    need_by_date = db.Column(db.String(10))

    # Status lifecycle
    status = db.Column(db.String(50), default='draft')
    # draft, submitted, iss_review, asr_review, finance_review, ko_review,
    # legal_review, cio_approval, senior_review, approved, awarded, closed, cancelled, returned

    # --- Guided Intake Answers (individual columns for rule evaluation) ---
    intake_q1_need_type = db.Column(db.String(30))  # new, continue_extend, change_existing
    intake_q2_situation = db.Column(db.String(50))
    # New: specific_vendor_yes, specific_vendor_no, specific_vendor_not_sure
    # Continue: options_remaining, expiring_same_vendor, expiring_compete, need_bridge, expired_gap, odc, travel
    # Change: add_scope, admin_correction, clin_reallocation, descope
    intake_q3_specific_vendor = db.Column(db.String(20))  # yes, no, not_sure
    intake_q4_existing_vehicle = db.Column(db.String(20))  # esi, bpa, gwac, gsa, no, not_sure
    intake_q5_change_type = db.Column(db.String(30))  # add_scope, admin_correction, clin_reallocation, descope
    intake_q_buy_category = db.Column(db.String(30))  # product, service, software_license, mixed
    intake_q_mixed_predominant = db.Column(db.String(30))  # predominantly_product, predominantly_service, roughly_equal

    # --- Derived Classification (system-computed) ---
    derived_acquisition_type = db.Column(db.String(40))
    # new_competitive, recompete, follow_on_sole_source, option_exercise, bridge_extension,
    # bilateral_mod, unilateral_mod, clin_reallocation, brand_name_sole_source, micro_purchase
    derived_tier = db.Column(db.String(20))  # micro, sat, above_sat, major
    derived_pipeline = db.Column(db.String(20))  # full, abbreviated, ko_only, micro
    derived_contract_character = db.Column(db.String(20))  # product, service, mixed_product, mixed_service
    derived_requirements_doc_type = db.Column(db.String(20))  # sow, pws, soo, specification, description
    derived_scls_applicable = db.Column(db.Boolean, default=False)
    derived_qasp_required = db.Column(db.Boolean, default=False)
    derived_eval_approach = db.Column(db.String(20))  # lpta, best_value, lowest_price

    intake_completed = db.Column(db.Boolean, default=False)
    intake_completed_date = db.Column(db.DateTime)
    intake_last_modified = db.Column(db.DateTime)

    # --- Existing Contract Fields (for continue/extend/change paths) ---
    existing_contract_number = db.Column(db.String(50))
    existing_contract_vendor = db.Column(db.String(200))
    existing_contract_value = db.Column(db.Float)
    existing_contract_end_date = db.Column(db.String(10))
    existing_contract_vehicle = db.Column(db.String(200))
    options_remaining = db.Column(db.Integer)
    current_option_year = db.Column(db.Integer)
    cpars_rating = db.Column(db.String(20))  # exceptional, very_good, satisfactory, marginal, unsatisfactory

    # --- Parallel Advisory Status (denormalized for quick display) ---
    scrm_status = db.Column(db.String(30), default='not_required')
    scrm_notes = db.Column(db.Text)
    sbo_status = db.Column(db.String(30), default='not_required')
    sbo_notes = db.Column(db.Text)
    cio_status = db.Column(db.String(30), default='not_required')
    cio_notes = db.Column(db.Text)
    section508_status = db.Column(db.String(30), default='not_required')

    # --- People ---
    requestor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    requestor_name = db.Column(db.String(200))
    requestor_org = db.Column(db.String(200))

    # --- Post-Award ---
    awarded_date = db.Column(db.String(10))
    awarded_vendor = db.Column(db.String(200))
    awarded_amount = db.Column(db.Float)
    po_number = db.Column(db.String(50))

    # --- Metadata ---
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    requestor = db.relationship('User', foreign_keys=[requestor_id])
    clins = db.relationship('AcquisitionCLIN', backref='request', lazy='dynamic', cascade='all, delete-orphan')
    documents = db.relationship('PackageDocument', backref='request', lazy='dynamic', cascade='all, delete-orphan')
    approval_steps = db.relationship('ApprovalStep', backref='request', lazy='dynamic', cascade='all, delete-orphan')
    advisory_inputs = db.relationship('AdvisoryInput', backref='request', lazy='dynamic', cascade='all, delete-orphan')
    activity_logs = db.relationship('ActivityLog', backref='request', lazy='dynamic', cascade='all, delete-orphan')

    ROLE_DISPLAY = {
        'branch_chief': 'Branch Chief',
        'cto': 'CTO',
        'cio': 'CIO',
        'ko': 'Contracting Officer',
        'legal': 'Legal',
        'budget': 'Budget/FM',
        'senior_leader': 'Senior Leadership',
        'scrm': 'SCRM',
        'sb': 'Small Business',
    }

    @property
    def action_with(self):
        """Determine who currently holds the action for this request."""
        if self.status == 'draft':
            return 'Requestor'
        if self.status in ('approved', 'awarded', 'closed', 'cancelled'):
            return None
        if self.status == 'returned':
            return 'Requestor'

        # Check for active approval step
        from app.models.approval import ApprovalStep
        active_step = ApprovalStep.query.filter_by(
            request_id=self.id, status='active'
        ).first()
        if active_step:
            return self.ROLE_DISPLAY.get(active_step.approver_role, active_step.approver_role.replace('_', ' ').title())

        # Check for advisory info requests waiting on requestor
        from app.models.advisory import AdvisoryInput
        info_req = AdvisoryInput.query.filter_by(
            request_id=self.id, status='info_requested'
        ).first()
        if info_req:
            return 'Requestor (info requested)'

        # Check if any advisories are pending
        pending_adv = AdvisoryInput.query.filter(
            AdvisoryInput.request_id == self.id,
            AdvisoryInput.status.in_(['requested', 'in_review'])
        ).first()
        if pending_adv:
            return f'Advisory ({pending_adv.team.upper()})'

        # Fallback based on status name
        status_map = {
            'submitted': 'Branch Chief',
            'iss_review': 'Branch Chief',
            'asr_review': 'CTO',
            'finance_review': 'Budget/FM',
            'ko_review': 'Contracting Officer',
            'legal_review': 'Legal',
            'cio_approval': 'CIO',
            'senior_review': 'Senior Leadership',
        }
        return status_map.get(self.status)

    def to_dict(self, include_relations=False):
        d = {
            'id': self.id,
            'request_number': self.request_number,
            'title': self.title,
            'description': self.description,
            'estimated_value': self.estimated_value,
            'fiscal_year': self.fiscal_year,
            'priority': self.priority,
            'need_by_date': self.need_by_date,
            'status': self.status,
            # Intake answers — clean aliases for frontend
            'need_type': self.intake_q1_need_type,
            'need_sub_type': self.intake_q2_situation,
            'vendor_known': self.intake_q3_specific_vendor,
            'existing_vehicle': self.intake_q4_existing_vehicle,
            'buy_category': self.intake_q_buy_category,
            'predominant_element': self.intake_q_mixed_predominant,
            # Derived — clean aliases for frontend
            'acquisition_type': self.derived_acquisition_type,
            'tier': self.derived_tier,
            'pipeline': self.derived_pipeline,
            'contract_character': self.derived_contract_character,
            'intake_completed': self.intake_completed,
            # Existing contract
            'existing_contract_number': self.existing_contract_number,
            'existing_contractor_name': self.existing_contract_vendor,
            'existing_contract_end': self.existing_contract_end_date,
            'existing_contract_vehicle': self.existing_contract_vehicle,
            # Advisory status
            'scrm_status': self.scrm_status,
            'sbo_status': self.sbo_status,
            'cio_status': self.cio_status,
            'section508_status': self.section508_status,
            # People
            'requestor_id': self.requestor_id,
            'requestor_name': self.requestor_name,
            # Post-award
            'awarded_date': self.awarded_date,
            'awarded_vendor': self.awarded_vendor,
            'awarded_amount': self.awarded_amount,
            # Meta
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'action_with': self.action_with,
        }
        if self.requestor:
            d['requestor'] = {
                'id': self.requestor.id,
                'display_name': self.requestor.name,
            }
        if include_relations:
            d['clins'] = [c.to_dict() for c in self.clins]
            d['documents'] = [doc.to_dict() for doc in self.documents]
            d['approval_steps'] = [s.to_dict() for s in self.approval_steps.order_by(db.text('step_number'))]
            d['advisory_inputs'] = [a.to_dict() for a in self.advisory_inputs]
        return d
