from flask import Blueprint
from backend.app.ml.model_manager import get_model_manager
from backend.app.schemas.responses import success_response

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def check_health():
    """Health check endpoint indicating API operational status and offline readiness."""
    mm = get_model_manager()
    status = mm.get_status()
    return success_response({
        'status': 'healthy',
        'application': 'Instant Persona and Communication Transformer',
        'version': '1.0.0',
        'device': status['device'],
        'offline_mode': status['offline_mode'],
        'models_ready': status['generation_model_loaded'] and status['intent_classifier_loaded']
    })

@health_bp.route('/models', methods=['GET'])
def get_models_status():
    """Returns local model loading status, cache paths, and device."""
    mm = get_model_manager()
    return success_response(mm.get_status())
