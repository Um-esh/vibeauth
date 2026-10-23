from datetime import datetime, timezone
from backend.app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class HistoryItem(db.Model):
    __tablename__ = 'rewrite_history'

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    original_text = db.Column(db.Text, nullable=False)
    rewritten_text = db.Column(db.Text, nullable=False)
    persona = db.Column(db.String(64), nullable=False)
    attributes = db.Column(db.JSON, nullable=False, default=dict)
    
    # ML Analysis metadata
    detected_intent = db.Column(db.String(64), nullable=True)
    detected_formality = db.Column(db.String(64), nullable=True)
    similarity_score = db.Column(db.Float, nullable=True)
    words_changed_percent = db.Column(db.Float, nullable=True)
    
    # Reports & Diffs
    preservation_report = db.Column(db.JSON, nullable=False, default=dict)
    diff_summary = db.Column(db.JSON, nullable=False, default=dict)
    passed_validation = db.Column(db.Boolean, default=True)
    
    # Diagnostics
    processing_time_ms = db.Column(db.Float, nullable=False, default=0.0)
    model_name = db.Column(db.String(128), nullable=False, default='flan-t5')

    def to_dict(self):
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'original_text': self.original_text,
            'rewritten_text': self.rewritten_text,
            'persona': self.persona,
            'attributes': self.attributes or {},
            'detected_intent': self.detected_intent,
            'detected_formality': self.detected_formality,
            'similarity_score': self.similarity_score,
            'words_changed_percent': self.words_changed_percent,
            'preservation_report': self.preservation_report or {},
            'diff_summary': self.diff_summary or {},
            'passed_validation': self.passed_validation,
            'processing_time_ms': self.processing_time_ms,
            'model_name': self.model_name
        }
