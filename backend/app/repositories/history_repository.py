from typing import List, Optional, Dict, Any
from backend.app.extensions import db
from backend.app.models.history_item import HistoryItem

class HistoryRepository:
    """Repository interface for rewrite history persistence."""

    @staticmethod
    def get_all(limit: int = 50, offset: int = 0) -> List[HistoryItem]:
        return HistoryItem.query.order_by(HistoryItem.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_by_id(item_id: int) -> Optional[HistoryItem]:
        return db.session.get(HistoryItem, item_id)

    @staticmethod
    def create(
        original_text: str,
        rewritten_text: str,
        persona: str,
        attributes: Dict[str, Any],
        diff_summary: Dict[str, Any],
        preservation_report: Dict[str, Any],
        processing_time_ms: float,
        model_name: str,
        detected_intent: Optional[str] = None,
        detected_formality: Optional[str] = None,
        similarity_score: Optional[float] = None,
        words_changed_percent: Optional[float] = None,
        passed_validation: bool = True
    ) -> HistoryItem:
        item = HistoryItem(
            original_text=original_text,
            rewritten_text=rewritten_text,
            persona=persona,
            attributes=attributes,
            diff_summary=diff_summary,
            preservation_report=preservation_report,
            processing_time_ms=processing_time_ms,
            model_name=model_name,
            detected_intent=detected_intent,
            detected_formality=detected_formality,
            similarity_score=similarity_score,
            words_changed_percent=words_changed_percent,
            passed_validation=passed_validation
        )
        db.session.add(item)
        db.session.commit()
        return item

    @staticmethod
    def delete(item_id: int) -> bool:
        item = db.session.get(HistoryItem, item_id)
        if not item:
            return False
        db.session.delete(item)
        db.session.commit()
        return True

    @staticmethod
    def clear_all() -> int:
        num_deleted = db.session.query(HistoryItem).delete()
        db.session.commit()
        return num_deleted
