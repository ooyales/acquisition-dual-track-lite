from datetime import datetime
from app.extensions import db


class AdvisoryInput(db.Model):
    __tablename__ = 'advisory_inputs'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('acquisition_requests.id'), nullable=False)
    team = db.Column(db.String(30), nullable=False)  # scrm, sbo, cio, section508, fm, legal
    status = db.Column(db.String(30), default='requested')
    # requested, in_review, info_requested, complete_no_issues, complete_issues_found, waived
    findings = db.Column(db.Text)
    recommendation = db.Column(db.Text)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    requested_date = db.Column(db.DateTime, default=datetime.utcnow)
    completed_date = db.Column(db.DateTime)
    impacts_strategy = db.Column(db.Boolean, default=False)
    blocks_gate = db.Column(db.String(20))  # none, iss, asr, ko_review
    info_request_message = db.Column(db.Text)  # What info the reviewer needs
    info_response = db.Column(db.Text)  # Requestor's response
    info_response_filename = db.Column(db.String(255))  # Original upload filename
    info_response_filepath = db.Column(db.String(500))  # Server-side file path

    reviewer = db.relationship('User', foreign_keys=[reviewer_id])

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'team': self.team,
            'status': self.status,
            'findings': self.findings,
            'recommendation': self.recommendation,
            'assigned_at': self.requested_date.isoformat() if self.requested_date else None,
            'completed_at': self.completed_date.isoformat() if self.completed_date else None,
            'impacts_strategy': self.impacts_strategy,
            'blocks_gate': self.blocks_gate,
            'info_request_message': self.info_request_message,
            'info_response': self.info_response,
            'info_response_filename': self.info_response_filename,
        }
