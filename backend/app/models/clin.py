from app.extensions import db


class AcquisitionCLIN(db.Model):
    __tablename__ = 'acquisition_clins'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('acquisition_requests.id'), nullable=False)
    clin_number = db.Column(db.String(10), nullable=False)
    description = db.Column(db.String(500))
    clin_type = db.Column(db.String(30))  # product, service, software_license, data
    psc_code_id = db.Column(db.Integer, db.ForeignKey('psc_codes.id'))
    loa_id = db.Column(db.Integer, db.ForeignKey('lines_of_accounting.id'))
    estimated_value = db.Column(db.Float, default=0)
    quantity = db.Column(db.Integer)
    unit_of_measure = db.Column(db.String(20))  # each, lot, hour, month, year, license
    period_of_performance = db.Column(db.String(100))
    contract_type = db.Column(db.String(20))  # ffp, t_and_m, labor_hour, cost_plus, hybrid
    scls_applicable = db.Column(db.Boolean, default=False)
    wage_determination_number = db.Column(db.String(50))
    severability = db.Column(db.String(20))  # severable, non_severable, tbd, na
    severability_basis = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)

    # Post-award balance tracking
    clin_ceiling = db.Column(db.Float, default=0)
    clin_obligated = db.Column(db.Float, default=0)
    clin_invoiced = db.Column(db.Float, default=0)

    psc = db.relationship('PSCCode', foreign_keys=[psc_code_id])
    execution_requests = db.relationship('CLINExecutionRequest', backref='clin', lazy='dynamic')

    @property
    def clin_pending(self):
        from app.models.execution import CLINExecutionRequest
        result = CLINExecutionRequest.query.filter(
            CLINExecutionRequest.clin_id == self.id,
            CLINExecutionRequest.status.in_(['authorized', 'executing'])
        ).with_entities(db.func.coalesce(db.func.sum(CLINExecutionRequest.estimated_cost), 0)).scalar()
        return float(result)

    @property
    def clin_available(self):
        return self.clin_obligated - self.clin_invoiced - self.clin_pending

    @property
    def clin_remaining_ceiling(self):
        return self.clin_ceiling - self.clin_obligated

    @property
    def clin_status(self):
        if self.clin_obligated == 0:
            return 'healthy'
        available = self.clin_available
        if available <= 0:
            return 'exhausted'
        burn = self.clin_burn_rate
        if burn > 0:
            months = available / burn
            if months < 1:
                return 'critical'
            if months < 3:
                return 'watch'
        return 'healthy'

    @property
    def clin_burn_rate(self):
        if self.clin_invoiced > 0:
            return self.clin_invoiced / max(1, 6)  # Simplified: assume 6-month average
        return 0

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'clin_number': self.clin_number,
            'description': self.description,
            'clin_type': self.clin_type,
            'psc_code_id': self.psc_code_id,
            'psc_code': self.psc.code if self.psc else None,
            'psc_title': self.psc.title if self.psc else None,
            'loa_id': self.loa_id,
            'loa_name': self.loa.display_name if self.loa else None,
            'estimated_value': self.estimated_value,
            'quantity': self.quantity,
            'unit_of_measure': self.unit_of_measure,
            'period_of_performance': self.period_of_performance,
            'contract_type': self.contract_type,
            'scls_applicable': self.scls_applicable,
            'wage_determination_number': self.wage_determination_number,
            'severability': self.severability,
            'severability_basis': self.severability_basis,
            'sort_order': self.sort_order,
            'notes': self.notes,
            # Balance tracking
            'clin_ceiling': self.clin_ceiling,
            'clin_obligated': self.clin_obligated,
            'clin_invoiced': self.clin_invoiced,
            'clin_pending': self.clin_pending,
            'clin_available': self.clin_available,
            'clin_remaining_ceiling': self.clin_remaining_ceiling,
            'clin_status': self.clin_status,
        }
