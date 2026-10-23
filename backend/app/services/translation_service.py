from typing import Dict, Any, Optional
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('translation_service')

SUPPORTED_LANGUAGES = {
    'en': 'English',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'hi': 'Hindi (हिन्दी)',
    'zh-cn': 'Chinese (Simplified)',
    'ja': 'Japanese (日本語)',
    'pt': 'Portuguese (Português)',
    'it': 'Italian (Italiano)',
    'ru': 'Russian (Русский)',
    'ar': 'Arabic (العربية)',
    'ko': 'Korean (한국어)',
    'nl': 'Dutch (Nederlands)',
    'tr': 'Turkish (Türkçe)'
}

class TranslationService:
    """
    Language translation service using googletrans with fallback to deep_translator.
    """

    @classmethod
    def translate(cls, text: str, target_lang: str = 'en', source_lang: str = 'auto') -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                'translated_text': '',
                'source_lang': source_lang,
                'target_lang': target_lang,
                'engine': 'none'
            }

        target_code = target_lang.lower().strip()
        if target_code == 'en' and source_lang == 'en':
            return {
                'translated_text': text,
                'source_lang': 'en',
                'target_lang': 'en',
                'engine': 'identity'
            }

        # 1. Primary: googletrans
        try:
            from googletrans import Translator
            translator = Translator()
            res = translator.translate(text, dest=target_code, src=source_lang if source_lang != 'auto' else 'auto')
            return {
                'translated_text': res.text,
                'source_lang': getattr(res, 'src', source_lang),
                'target_lang': target_code,
                'engine': 'googletrans'
            }
        except Exception as e:
            logger.warning(f"googletrans error ({e}). Attempting fallback...")

        # 2. Fallback: deep_translator GoogleTranslator
        try:
            from deep_translator import GoogleTranslator
            dt = GoogleTranslator(source=source_lang, target=target_code)
            res_text = dt.translate(text)
            return {
                'translated_text': res_text,
                'source_lang': source_lang,
                'target_lang': target_code,
                'engine': 'deep_translator_google'
            }
        except Exception as e2:
            logger.error(f"Fallback translation also failed: {e2}")
            # If network is unavailable or blocked, return original text safely
            return {
                'translated_text': text,
                'source_lang': source_lang,
                'target_lang': target_code,
                'engine': 'error_fallback',
                'error': str(e2)
            }
