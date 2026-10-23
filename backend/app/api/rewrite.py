import uuid
from flask import Blueprint, request
from pydantic import ValidationError
from backend.app.schemas.requests import RewriteRequest, AnalyzeRequest, TranslateRequest
from backend.app.schemas.responses import success_response, error_response
from backend.app.services.rewrite_service import RewriteService
from backend.app.services.translation_service import TranslationService, SUPPORTED_LANGUAGES
from backend.app.ml.text_analyzer import TextAnalyzer
from backend.app.repositories.history_repository import HistoryRepository
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('rewrite_api')
rewrite_bp = Blueprint('rewrite', __name__)

@rewrite_bp.route('/rewrite', methods=['POST'])
def rewrite_text():
    req_id = str(uuid.uuid4())[:8]
    data = request.get_json(silent=True)
    if not data:
        return error_response("Malformed JSON body or Content-Type is not application/json.", status_code=400)

    try:
        req_obj = RewriteRequest(**data)
    except ValidationError as e:
        clean_errors = [
            {'field': '.'.join(str(x) for x in err.get('loc', [])), 'message': err.get('msg', 'Invalid input')}
            for err in e.errors()
        ]
        return error_response("Validation error", details=clean_errors, status_code=422)

    try:
        logger.info(f"[{req_id}] Processing rewrite request: persona={req_obj.persona}, chars={len(req_obj.text)}")
        result = RewriteService.execute_pipeline(
            text=req_obj.text,
            persona=req_obj.persona,
            attributes=req_obj.attributes.model_dump() if req_obj.attributes else None,
            enable_controlled_regeneration=req_obj.enable_regeneration
        )

        # Optional Google Translate step if target language is not English
        target_lang = getattr(req_obj, 'target_language', 'en') or 'en'
        translated_text = None
        if target_lang != 'en':
            trans_res = TranslationService.translate(result['rewritten_text'], target_lang=target_lang)
            translated_text = trans_res.get('translated_text')

        result['translated_text'] = translated_text
        result['target_language'] = target_lang
        result['translation_engine'] = trans_res.get('engine') if (target_lang != 'en' and translated_text) else None

        history_id = None
        if req_obj.save_to_history:
            try:
                hist_item = HistoryRepository.create(
                    original_text=result['original_text'],
                    rewritten_text=result['rewritten_text'],
                    persona=result['persona'],
                    attributes=result['attributes'],
                    diff_summary={
                        'words_added': result['diff']['words_added'],
                        'words_removed': result['diff']['words_removed'],
                        'words_changed_percent': result['diff']['words_changed_percent']
                    },
                    preservation_report=result['preservation_report'],
                    processing_time_ms=result['processing_time_ms'],
                    model_name=result['model_info']['name'],
                    detected_intent=result['source_analysis']['classification']['detected_intent'],
                    detected_formality=result['source_analysis']['classification']['detected_formality'],
                    similarity_score=result['preservation_report']['semantic_similarity']['similarity_score'],
                    words_changed_percent=result['diff']['words_changed_percent'],
                    passed_validation=result['preservation_report']['passed']
                )
                history_id = hist_item.id
            except Exception as e:
                logger.warning(f"[{req_id}] Failed to persist to history: {e}")

        result['history_id'] = history_id
        result['request_id'] = req_id
        return success_response(result)

    except RuntimeError as e:
        logger.error(f"[{req_id}] ML Engine Error: {e}")
        return error_response(str(e), status_code=503)
    except Exception as e:
        logger.exception(f"[{req_id}] Internal server error during rewrite: {e}")
        return error_response(f"Internal processing failure: {str(e)}", status_code=500)

@rewrite_bp.route('/languages', methods=['GET'])
def get_languages():
    """Returns supported target languages for Google Translate."""
    return success_response(SUPPORTED_LANGUAGES)

@rewrite_bp.route('/translate', methods=['POST'])
def translate_text():
    """Translates text using googletrans with fallback to deep_translator."""
    data = request.get_json(silent=True)
    if not data:
        return error_response("Malformed JSON body.", status_code=400)

    try:
        req_obj = TranslateRequest(**data)
    except ValidationError as e:
        clean_errors = [
            {'field': '.'.join(str(x) for x in err.get('loc', [])), 'message': err.get('msg', 'Invalid input')}
            for err in e.errors()
        ]
        return error_response("Validation error", details=clean_errors, status_code=422)

    try:
        res = TranslationService.translate(
            text=req_obj.text,
            target_lang=req_obj.target_lang,
            source_lang=req_obj.source_lang or 'auto'
        )
        return success_response(res)
    except Exception as e:
        logger.exception(f"Translation failure: {e}")
        return error_response(f"Translation failure: {str(e)}", status_code=500)

@rewrite_bp.route('/analyze', methods=['POST'])
def analyze_text():
    req_id = str(uuid.uuid4())[:8]
    data = request.get_json(silent=True)
    if not data:
        return error_response("Malformed JSON body or Content-Type is not application/json.", status_code=400)

    try:
        req_obj = AnalyzeRequest(**data)
    except ValidationError as e:
        clean_errors = [
            {'field': '.'.join(str(x) for x in err.get('loc', [])), 'message': err.get('msg', 'Invalid input')}
            for err in e.errors()
        ]
        return error_response("Validation error", details=clean_errors, status_code=422)

    try:
        analysis = TextAnalyzer.analyze(req_obj.text)
        return success_response({'source_analysis': analysis, 'request_id': req_id})
    except Exception as e:
        logger.exception(f"[{req_id}] Internal server error during analysis: {e}")
        return error_response(f"Internal analysis failure: {str(e)}", status_code=500)

    req_id = str(uuid.uuid4())[:8]
    data = request.get_json(silent=True)
    if not data:
        return error_response("Malformed JSON body or Content-Type is not application/json.", status_code=400)

    try:
        req_obj = AnalyzeRequest(**data)
    except ValidationError as e:
        clean_errors = [
            {'field': '.'.join(str(x) for x in err.get('loc', [])), 'message': err.get('msg', 'Invalid input')}
            for err in e.errors()
        ]
        return error_response("Validation error", details=clean_errors, status_code=422)

    try:
        analysis = TextAnalyzer.analyze(req_obj.text)
        return success_response({'source_analysis': analysis, 'request_id': req_id})
    except Exception as e:
        logger.exception(f"[{req_id}] Internal server error during analysis: {e}")
        return error_response(f"Internal analysis failure: {str(e)}", status_code=500)
