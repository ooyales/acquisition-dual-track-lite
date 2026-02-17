from datetime import datetime
from app.extensions import db


class CLINExecutionRequest(db.Model):
    __tablename__ = 'clin_execution_requests'

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(20), unique=True, nullable=False)
    execution_type = db.Column(db.String(20), nullable=False)  # odc, travel
    contract_id = db.Column(db.Integer, db.ForeignKey('acquisition_requests.id'))
    clin_id = db.Column(db.Integer, db.ForeignKey('acquisition_clins.id'))
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    estimated_cost = db.Column(db.Float, default=0)
    actual_cost = db.Column(db.Float)
    requested_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    requested_date = db.Column(db.DateTime, default=datetime.utcnow)
    need_by_date = db.Column(db.String(10))

    # Status lifecycle
    status = db.Column(db.String(30), default='draft')
    # draft, submitted, pm_approved, cto_approved, funding_action_required,
    # funding_action_complete, authorized, executing, invoice_received,
    # cor_validated, complete, rejected, cancelled

    # Funding
    funding_status = db.Column(db.String(30))  # sufficient, insufficient, in_progress, complete
    funding_action_required = db.Column(db.Boolean, default=False)
    funding_action_amount = db.Column(db.Float)

    # PM Approval
    pm_approval = db.Column(db.String(20))  # pending, approved, rejected, returned
    pm_approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    pm_approved_date = db.Column(db.DateTime)
    pm_comments = db.Column(db.Text)

    # CTO Approval
    cto_approval = db.Column(db.String(20))
    cto_approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    cto_approved_date = db.Column(db.DateTime)
    cto_comments = db.Column(db.Text)

    # Post-execution
    performer_notified_date = db.Column(db.DateTime)
    invoice_number = db.Column(db.String(50))
    invoice_date = db.Column(db.String(10))
    cor_validated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    cor_validated_date = db.Column(db.DateTime)

    # ODC-specific fields
    odc_product_name = db.Column(db.String(300))
    odc_vendor = db.Column(db.String(200))
    odc_quote_number = db.Column(db.String(100))
    odc_renewal_period = db.Column(db.String(50))
    odc_prior_year_cost = db.Column(db.Float)

    # Travel-specific fields
    travel_traveler_name = db.Column(db.String(200))
    travel_traveler_org = db.Column(db.String(20))  # government, contractor
    travel_destination = db.Column(db.String(300))
    travel_purpose = db.Column(db.Text)
    travel_departure_date = db.Column(db.String(10))
    travel_return_date = db.Column(db.String(10))
    travel_airfare = db.Column(db.Float, default=0)
    travel_lodging = db.Column(db.Float, default=0)
    travel_per_diem = db.Column(db.Float, default=0)
    travel_rental_car = db.Column(db.Float, default=0)
    travel_other_costs = db.Column(db.Float, default=0)
    travel_actual_airfare = db.Column(db.Float)
    travel_actual_lodging = db.Column(db.Float)
    travel_actual_per_diem = db.Column(db.Float)
    travel_actual_rental_car = db.Column(db.Float)
    travel_actual_other = db.Column(db.Float)
    travel_actual_total = db.Column(db.Float)
    travel_conference_event = db.Column(db.String(200))

    notes = db.Column(db.Text)

    # Relationships
    contract = db.relationship('AcquisitionRequest', foreign_keys=[contract_id])
    requested_by = db.relationship('User', foreign_keys=[requested_by_id])
    pm_approved_by = db.relationship('User', foreign_keys=[pm_approved_by_id])
    cto_approved_by = db.relationship('User', foreign_keys=[cto_approved_by_id])
    cor_validated_by = db.relationship('User', foreign_keys=[cor_validated_by_id])

    @property
    def cost_variance(self):
        if self.actual_cost is not None and self.estimated_cost:
            return self.actual_cost - self.estimated_cost
        return None

    @property
    def travel_total_estimate(self):
        if self.execution_type == 'travel':
            return (self.travel_airfare or 0) + (self.travel_lodging or 0) + \
                   (self.travel_per_diem or 0) + (self.travel_rental_car or 0) + \
                   (self.travel_other_costs or 0)
        return None

    def to_dict(self):
        d = {
            'id': self.id,
            'request_number': self.request_number,
            'execution_type': self.execution_type,
            'contract_id': self.contract_id,
            'contract_number': self.contract.request_number if self.contract else None,
            'clin_id': self.clin_id,
            'clin_number': self.clin.clin_number if self.clin else None,
            'title': self.title,
            'description': self.description,
            'estimated_cost': self.estimated_cost,
            'actual_cost': self.actual_cost,
            'cost_variance': self.cost_variance,
            'requested_by_id': self.requested_by_id,
            'requested_by_name': self.requested_by.name if self.requested_by else None,
            'requested_date': self.requested_date.isoformat() if self.requested_date else None,
            'need_by_date': self.need_by_date,
            'status': self.status,
            'funding_status': self.funding_status,
            'funding_action_required': self.funding_action_required,
            'funding_action_amount': self.funding_action_amount,
            'pm_approval': self.pm_approval,
            'pm_approved_date': self.pm_approved_date.isoformat() if self.pm_approved_date else None,
            'pm_comments': self.pm_comments,
            'cto_approval': self.cto_approval,
            'cto_approved_date': self.cto_approved_date.isoformat() if self.cto_approved_date else None,
            'cto_comments': self.cto_comments,
            'invoice_number': self.invoice_number,
            'invoice_date': self.invoice_date,
            'notes': self.notes,
        }
        if self.execution_type == 'odc':
            d.update({
                'odc_product_name': self.odc_product_name,
                'odc_vendor': self.odc_vendor,
                'odc_quote_number': self.odc_quote_number,
                'odc_renewal_period': self.odc_renewal_period,
                'odc_prior_year_cost': self.odc_prior_year_cost,
            })
        elif self.execution_type == 'travel':
            d.update({
                'travel_traveler_name': self.travel_traveler_name,
                'travel_traveler_org': self.travel_traveler_org,
                'travel_destination': self.travel_destination,
                'travel_purpose': self.travel_purpose,
                'travel_departure_date': self.travel_departure_date,
                'travel_return_date': self.travel_return_date,
                'travel_airfare': self.travel_airfare,
                'travel_lodging': self.travel_lodging,
                'travel_per_diem': self.travel_per_diem,
                'travel_rental_car': self.travel_rental_car,
                'travel_other_costs': self.travel_other_costs,
                'travel_total_estimate': self.travel_total_estimate,
                'travel_actual_airfare': self.travel_actual_airfare,
                'travel_actual_lodging': self.travel_actual_lodging,
                'travel_actual_per_diem': self.travel_actual_per_diem,
                'travel_actual_rental_car': self.travel_actual_rental_car,
                'travel_actual_other': self.travel_actual_other,
                'travel_actual_total': self.travel_actual_total,
                'travel_conference_event': self.travel_conference_event,
            })
        return d
