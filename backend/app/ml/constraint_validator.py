from typing import Dict, Any, List
from backend.app.utils.text_processing import detect_negations, detect_obligations

# Equivalent prohibitive terms that preserve negative polarity without explicitly using 'not'
PROHIBITION_TERMS = {'prohibit', 'forbidden', 'refrain', 'avoid', 'prevent', 'ban', 'disallow', 'stop'}

# Equivalent mandatory terms
MANDATORY_TERMS = {'mandatory', 'must', 'shall', 'required', 'obligated', 'essential', 'have to', 'has to'}

class ConstraintValidator:
    """
    Validates logical invariants between original and rewritten text:
    - Negation polarity preservation (ensuring a negative rule was not turned positive or vice versa)
    - Modal obligation shifts (mandatory vs discretionary)
    - Commitment preservation
    """

    @classmethod
    def validate_negation(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """
        Detects potential negation shifts or polarity inversions.
        """
        orig_negs = detect_negations(original_text)
        rewr_negs = detect_negations(rewritten_text)
        
        orig_has_neg = len(orig_negs) > 0
        rewr_has_neg = len(rewr_negs) > 0
        
        orig_lower = original_text.lower()
        rewr_lower = rewritten_text.lower()
        
        rewr_has_prohibition = any(term in rewr_lower for term in PROHIBITION_TERMS)
        orig_has_prohibition = any(term in orig_lower for term in PROHIBITION_TERMS)
        
        orig_effective_neg = orig_has_neg or orig_has_prohibition
        rewr_effective_neg = rewr_has_neg or rewr_has_prohibition
        
        passed = True
        warning = None
        severity = 'info'
        
        # Original was negative but rewrite is completely positive
        if orig_effective_neg and not rewr_effective_neg:
            passed = False
            severity = 'high'
            warning = (
                f"Potential Negation Loss: The original text contained negation/prohibition ({orig_negs}), "
                "which appears missing from the rewritten text. Verify that restrictions were not accidentally inverted."
            )
        # Original was positive but rewrite introduced negative
        elif not orig_effective_neg and rewr_effective_neg:
            passed = False
            severity = 'medium'
            warning = (
                f"Potential Negation Introduction: Rewritten text introduced negative terms ({rewr_negs}) "
                "not present in the original. Verify intent was not inverted."
            )

        return {
            'passed': passed,
            'severity': severity,
            'original_negations': orig_negs,
            'rewritten_negations': rewr_negs,
            'warning': warning
        }

    @classmethod
    def validate_obligations(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """
        Detects modal shifts between mandatory obligations and discretionary suggestions.
        """
        orig_obs = detect_obligations(original_text)
        rewr_obs = detect_obligations(rewritten_text)
        
        orig_has_mandatory = len(orig_obs['obligations']) > 0
        rewr_has_mandatory = len(rewr_obs['obligations']) > 0
        
        orig_has_discretionary = len(orig_obs['discretionary']) > 0
        rewr_has_discretionary = len(rewr_obs['discretionary']) > 0
        
        passed = True
        warning = None
        severity = 'info'
        
        # Mandatory obligation softened into discretionary
        if orig_has_mandatory and not rewr_has_mandatory and rewr_has_discretionary:
            passed = False
            severity = 'medium'
            warning = (
                f"Obligation Softened: A mandatory requirement in the original ({orig_obs['obligations']}) "
                f"was converted to a discretionary/optional tone ({rewr_obs['discretionary']})."
            )
        # Discretionary suggestion hardened into mandatory obligation
        elif orig_has_discretionary and not orig_has_mandatory and rewr_has_mandatory:
            passed = False
            severity = 'medium'
            warning = (
                f"Obligation Hardened: An optional or suggested item ({orig_obs['discretionary']}) "
                f"was transformed into a strict mandatory obligation ({rewr_obs['obligations']})."
            )

        return {
            'passed': passed,
            'severity': severity,
            'original_obligations': orig_obs,
            'rewritten_obligations': rewr_obs,
            'warning': warning
        }

    @classmethod
    def evaluate_all_constraints(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """Runs all logical and semantic constraint checks."""
        neg_check = cls.validate_negation(original_text, rewritten_text)
        ob_check = cls.validate_obligations(original_text, rewritten_text)
        
        all_passed = neg_check['passed'] and ob_check['passed']
        warnings = []
        if neg_check['warning']:
            warnings.append(neg_check['warning'])
        if ob_check['warning']:
            warnings.append(ob_check['warning'])
            
        return {
            'passed': all_passed,
            'negation_check': neg_check,
            'obligation_check': ob_check,
            'warnings': warnings
        }
