from app.extensions import db


class PerDiemRate(db.Model):
    __tablename__ = 'per_diem_rates'

    id = db.Column(db.Integer, primary_key=True)
    location = db.Column(db.String(200), nullable=False)
    state = db.Column(db.String(50))
    fiscal_year = db.Column(db.String(4))
    lodging_rate = db.Column(db.Float)
    mie_rate = db.Column(db.Float)
    effective_date = db.Column(db.String(10))

    def to_dict(self):
        return {
            'id': self.id,
            'location': self.location,
            'state': self.state,
            'fiscal_year': self.fiscal_year,
            'lodging_rate': self.lodging_rate,
            'mie_rate': self.mie_rate,
            'effective_date': self.effective_date,
        }
