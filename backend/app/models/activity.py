from datetime import datetime
from app.extensions import db


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('acquisition_requests.id'))
    activity_type = db.Column(db.String(50))  # created, submitted, approved, rejected, returned, document_updated, advisory_completed, etc.
    description = db.Column(db.Text)
    actor = db.Column(db.String(200))
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'activity_type': self.activity_type,
            'description': self.description,
            'actor': self.actor,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
