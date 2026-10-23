from flask import Blueprint, request
from backend.app.repositories.history_repository import HistoryRepository
from backend.app.schemas.responses import success_response, error_response
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('history_api')
history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
def get_history():
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    items = HistoryRepository.get_all(limit=limit, offset=offset)
    return success_response([item.to_dict() for item in items])

@history_bp.route('/history/<int:item_id>', methods=['GET'])
def get_history_item(item_id: int):
    item = HistoryRepository.get_by_id(item_id)
    if not item:
        return error_response(f"History entry with ID {item_id} not found.", status_code=404)
    return success_response(item.to_dict())

@history_bp.route('/history/<int:item_id>', methods=['DELETE'])
def delete_history_item(item_id: int):
    success = HistoryRepository.delete(item_id)
    if not success:
        return error_response(f"History entry with ID {item_id} not found.", status_code=404)
    return success_response({'id': item_id, 'deleted': True}, message="Entry deleted successfully.")

@history_bp.route('/history', methods=['DELETE'])
def clear_all_history():
    confirm = request.args.get('confirm', '').lower()
    if confirm not in ('true', '1', 'yes'):
        return error_response("Confirmation required to clear all history. Append '?confirm=true'.", status_code=400)
    count = HistoryRepository.clear_all()
    return success_response({'deleted_count': count}, message=f"Cleared {count} historical records.")
