from app.extensions import db


class ThresholdConfig(db.Model):
    __tablename__ = 'threshold_configs'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # micro_purchase, simplified_acquisition, above_sat, ja_threshold, etc.
    dollar_limit = db.Column(db.Float, nullable=False)
    effective_date = db.Column(db.String(10))  # YYYY-MM-DD
    end_date = db.Column(db.String(10))
    far_reference = db.Column(db.String(50))
    tier_determines = db.Column(db.String(200))  # Human-readable: "Micro-Purchase ≤ this value"
    description = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'dollar_limit': self.dollar_limit,
            'effective_date': self.effective_date,
            'end_date': self.end_date,
            'far_reference': self.far_reference,
            'tier_determines': self.tier_determines,
            'description': self.description,
        }
