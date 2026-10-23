import time
from typing import Dict, Any, Optional
from backend.app.config import Config
from backend.app.ml.text_analyzer import TextAnalyzer
from backend.app.ml.generator import TextGenerator
from backend.app.services.validation_service import ValidationService
from backend.app.ml.diff_service import DiffService
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('rewrite_service')

class RewriteService:
    """
    End-to-end multi-stage pipeline coordinator:
    Stage 1: Input Analysis & Extraction
    Stage 2: Intent & Formality Inference
    Stage 3: Persona-Aware Generation
    Stage 4: Meaning-Preservation Validation
    Stage 5: Controlled Corrective Regeneration
    Stage 6: Textual Change Diff Computation
    Stage 7: Final Structured Synthesis
    """

    @classmethod
    def execute_pipeline(
        cls,
        text: str,
        persona: str,
        attributes: Optional[Dict[str, int]] = None,
        enable_controlled_regeneration: bool = True
    ) -> Dict[str, Any]:
        pipeline_start = time.perf_counter()
        
        # Stage 1 & 2: Input processing and source intent/style analysis
        source_analysis = TextAnalyzer.analyze(text)
        
        # Stage 3: Initial Generation
        gen_result = TextGenerator.generate(
            text=text,
            persona=persona,
            attributes=attributes
        )
        current_rewritten = gen_result['rewritten_text']
        generation_ms = gen_result['processing_time_ms']
        regeneration_attempted = False
        
        # Stage 4: Meaning-Preservation Validation
        val_report = ValidationService.validate_transformation(text, current_rewritten)
        
        # Stage 5: Controlled Corrective Regeneration
        if (
            enable_controlled_regeneration and
            not val_report['passed'] and
            val_report['failed_constraints'] and
            Config.MAX_REGENERATION_ATTEMPTS > 0
        ):
            logger.info(f"Preservation constraints failed ({len(val_report['failed_constraints'])} items). Attempting controlled regeneration.")
            try:
                regen_result = TextGenerator.generate(
                    text=text,
                    persona=persona,
                    attributes=attributes,
                    constraints=val_report['failed_constraints']
                )
                candidate_rewritten = regen_result['rewritten_text']
                
                # Never accept an identical verbatim copy as a successful regeneration
                if candidate_rewritten.strip() != text.strip():
                    candidate_val = ValidationService.validate_transformation(text, candidate_rewritten)
                    if (
                        candidate_val['semantic_similarity']['similarity_score'] >= val_report['semantic_similarity']['similarity_score'] or
                        candidate_val['risk_level'] != 'high'
                    ):
                        current_rewritten = candidate_rewritten
                        val_report = candidate_val
                        generation_ms += regen_result['processing_time_ms']
                        regeneration_attempted = True
            except Exception as e:
                logger.warning(f"Controlled regeneration attempt failed: {e}")

        # Stage 6: Textual Change Analysis
        diff_result = DiffService.compute_diff(text, current_rewritten)
        
        total_time_ms = round((time.perf_counter() - pipeline_start) * 1000, 1)

        # Stage 7: Final Structured Output
        return {
            'original_text': text,
            'rewritten_text': current_rewritten,
            'persona': persona,
            'attributes': attributes or {
                'formality': 3,
                'conciseness': 3,
                'friendliness': 3,
                'energy': 3,
                'persuasiveness': 3,
                'technical_depth': 3
            },
            'source_analysis': source_analysis,
            'diff': diff_result,
            'preservation_report': val_report,
            'regeneration_attempted': regeneration_attempted,
            'processing_time_ms': total_time_ms,
            'generation_time_ms': generation_ms,
            'model_info': {
                'name': gen_result.get('model_name', Config.GENERATION_MODEL_NAME),
                'device': gen_result.get('device_used', 'cpu')
            }
        }
