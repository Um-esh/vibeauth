from typing import Dict, Any, List
from backend.app.ml.entity_validator import EntityValidator
from backend.app.ml.constraint_validator import ConstraintValidator
from backend.app.ml.semantic_analyzer import SemanticAnalyzer

class ValidationService:
    """
    Orchestrates Stage 4 Meaning-Preservation Analysis.
    Compares original and rewritten text across entity, numerical, date,
    negation, obligation, and semantic similarity dimensions.
    """

    @classmethod
    def validate_transformation(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """Runs the complete verification pipeline and generates an actionable report."""
        entity_res = EntityValidator.validate_entities(original_text, rewritten_text)
        num_res = EntityValidator.validate_numbers(original_text, rewritten_text)
        date_res = EntityValidator.validate_dates(original_text, rewritten_text)
        contact_res = EntityValidator.validate_contacts(original_text, rewritten_text)
        constraint_res = ConstraintValidator.evaluate_all_constraints(original_text, rewritten_text)
        similarity_res = SemanticAnalyzer.compute_similarity(original_text, rewritten_text)

        warnings: List[str] = []
        failed_constraints: List[str] = []

        if entity_res['warning']:
            warnings.append(entity_res['warning'])
            if entity_res['missing_entities']:
                failed_constraints.append(f"Ensure these named entities appear verbatim: {', '.join(entity_res['missing_entities'])}.")

        if num_res['warning']:
            warnings.append(num_res['warning'])
            if num_res['missing_numbers']:
                failed_constraints.append(f"Include these numbers/percentages: {', '.join(num_res['missing_numbers'])}.")

        if date_res['warning']:
            warnings.append(date_res['warning'])
            if date_res['missing_dates']:
                failed_constraints.append(f"Preserve these deadlines and dates: {', '.join(date_res['missing_dates'])}.")

        if contact_res['warning']:
            warnings.append(contact_res['warning'])

        if constraint_res['warnings']:
            warnings.extend(constraint_res['warnings'])
            if not constraint_res['negation_check']['passed']:
                failed_constraints.append("Preserve the exact negative/prohibitive restrictions from the original.")
            if not constraint_res['obligation_check']['passed']:
                failed_constraints.append("Do not alter mandatory vs discretionary requirements.")

        # Determine overall pass status and risk level
        # High risk: missing entities, missing numbers, or broken negation
        critical_failure = (
            not entity_res['passed'] or
            not num_res['passed'] or
            not date_res['passed'] or
            not constraint_res['negation_check']['passed']
        )
        
        sim_score = similarity_res['similarity_score']
        
        if critical_failure:
            risk_level = 'high'
            passed = False
        elif warnings or sim_score < 0.60:
            risk_level = 'medium'
            passed = False
        else:
            risk_level = 'low'
            passed = True

        return {
            'passed': passed,
            'risk_level': risk_level,
            'entity_check': entity_res,
            'number_check': num_res,
            'date_check': date_res,
            'contact_check': contact_res,
            'constraint_check': constraint_res,
            'semantic_similarity': similarity_res,
            'warnings': warnings,
            'failed_constraints': failed_constraints,
            'disclaimer': (
                "Automated checks provide statistical and pattern-based heuristics. "
                "They do not constitute a formal guarantee of complete factual accuracy."
            )
        }
