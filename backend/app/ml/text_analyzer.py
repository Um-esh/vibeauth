from typing import Dict, Any, List
from backend.app.utils.text_processing import (
    split_sentences,
    tokenize_words,
    extract_entities,
    extract_numbers,
    extract_dates,
    extract_contact_info,
    compute_text_stats,
    detect_negations,
    detect_obligations
)
from backend.app.ml.model_manager import get_model_manager
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('text_analyzer')

class TextAnalyzer:
    """
    Performs Stage 1 (Input Processing & Extraction) and
    Stage 2 (Intent & Style Classification) on the input text.
    """

    @classmethod
    def analyze(cls, text: str) -> Dict[str, Any]:
        """
        Executes comprehensive syntactic, lexical, entity, and classification analysis.
        Retains original text unchanged.
        """
        clean_text = text.strip() if text else ""
        
        # Stage 1: Extraction & Statistics
        sentences = split_sentences(clean_text)
        tokens = tokenize_words(clean_text)
        stats = compute_text_stats(clean_text)
        entities = extract_entities(clean_text)
        numbers = extract_numbers(clean_text)
        dates = extract_dates(clean_text)
        contacts = extract_contact_info(clean_text)
        negations = detect_negations(clean_text)
        obligations = detect_obligations(clean_text)
        
        # Stage 2: Intent & Formality Inference via trained ML models
        mm = get_model_manager()
        intent_label = "informative_update"
        intent_confidence = 0.5
        formality_label = "neutral"
        formality_confidence = 0.5
        
        if clean_text:
            if mm.intent_classifier is not None:
                try:
                    pred = mm.intent_classifier.predict([clean_text])[0]
                    intent_label = str(pred)
                    if hasattr(mm.intent_classifier, "predict_proba"):
                        probs = mm.intent_classifier.predict_proba([clean_text])[0]
                        intent_confidence = round(float(max(probs)), 3)
                except Exception as e:
                    logger.warning(f"Intent prediction error: {e}")
            else:
                # Rule-based fallback if model weights not yet trained
                if '?' in clean_text or any(w in clean_text.lower() for w in ['please', 'could you', 'need you to']):
                    intent_label = "action_request"
                elif any(w in clean_text.lower() for w in ['approved', 'decided', 'authorized']):
                    intent_label = "decision_announcement"
                elif any(w in clean_text.lower() for w in ['pursuant', 'compliance', 'gdpr', 'policy']):
                    intent_label = "compliance_notice"

            if mm.formality_classifier is not None:
                try:
                    pred = mm.formality_classifier.predict([clean_text])[0]
                    formality_label = str(pred)
                    if hasattr(mm.formality_classifier, "predict_proba"):
                        probs = mm.formality_classifier.predict_proba([clean_text])[0]
                        formality_confidence = round(float(max(probs)), 3)
                except Exception as e:
                    logger.warning(f"Formality prediction error: {e}")
            else:
                if any(w in clean_text.lower() for w in ['pursuant', 'hereby', 'accordance', 'furthermore']):
                    formality_label = "formal"
                elif any(w in clean_text.lower() for w in ['hey', 'yo', 'lol', 'hype', 'sup', 'props']):
                    formality_label = "informal"

        return {
            'text': clean_text,
            'statistics': stats,
            'sentences': sentences,
            'token_count': len(tokens),
            'extracted_entities': entities,
            'extracted_numbers': numbers,
            'extracted_dates': dates,
            'urls': contacts['urls'],
            'emails': contacts['emails'],
            'negation_words': negations,
            'obligation_terms': obligations['obligations'],
            'discretionary_terms': obligations['discretionary'],
            'classification': {
                'detected_intent': intent_label,
                'intent_confidence': intent_confidence,
                'detected_formality': formality_label,
                'formality_confidence': formality_confidence
            }
        }
