from app.extensions import db


class AdvisoryTriggerRule(db.Model):
    """Defines when each advisory team is notified and what they review.

    Advisory inputs are parallel (non-blocking) unless blocks_gate is True.
    """
    __tablename__ = 'advisory_trigger_rules'

    id = db.Column(db.Integer, primary_key=True)
    trigger_id = db.Column(db.String(20), unique=True, nullable=False)  # ADV-001
    team = db.Column(db.String(30), nullable=False)           # SCRM, SBO, CIO, Section 508, FM, FedRAMP PMO
    trigger_condition = db.Column(db.Text)                     # Human-readable condition
    data_needed = db.Column(db.Text)                           # What data the team needs
    feeds_into_gate = db.Column(db.String(50))                 # Which gate(s) this feeds into
    blocks_gate = db.Column(db.Boolean, default=False)         # Whether this blocks progression
    sla_days = db.Column(db.Integer, default=5)
    escalation_to = db.Column(db.String(100))
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'trigger_id': self.trigger_id,
            'team': self.team,
            'trigger_condition': self.trigger_condition,
            'data_needed': self.data_needed,
            'feeds_into_gate': self.feeds_into_gate,
            'blocks_gate': self.blocks_gate,
            'sla_days': self.sla_days,
            'escalation_to': self.escalation_to,
            'notes': self.notes,
        }
