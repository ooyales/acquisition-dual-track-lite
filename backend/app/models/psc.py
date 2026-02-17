from app.extensions import db


class PSCCode(db.Model):
    __tablename__ = 'psc_codes'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False)
    title = db.Column(db.String(300), nullable=False)
    category = db.Column(db.String(50))  # services, rnd, supplies_equipment
    service_or_product = db.Column(db.String(20))  # product, service
    group_name = db.Column(db.String(100))
    is_it_related = db.Column(db.Boolean, default=False)
    sb_availability = db.Column(db.String(20))  # high, medium, low
    typical_scls_applicable = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='active')  # active, retired

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'title': self.title,
            'category': self.category,
            'service_or_product': self.service_or_product,
            'group_name': self.group_name,
            'is_it_related': self.is_it_related,
            'sb_availability': self.sb_availability,
            'typical_scls_applicable': self.typical_scls_applicable,
            'status': self.status,
        }
