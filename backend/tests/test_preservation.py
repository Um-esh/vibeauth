import pytest
from backend.app.ml.entity_validator import EntityValidator
from backend.app.ml.constraint_validator import ConstraintValidator
from backend.app.services.validation_service import ValidationService

def test_entity_preservation_success():
    orig = "Sarah Jenkins and Dr. Robert Lee finalized the agreement."
    rewr = "The agreement was finalized by Sarah Jenkins and Dr. Robert Lee."
    val = EntityValidator.validate_entities(orig, rewr)
    assert val['passed'] is True
    assert len(val['missing_entities']) == 0

def test_entity_preservation_failure_detected():
    orig = "Sarah Jenkins and Dr. Robert Lee finalized the agreement."
    rewr = "The agreement was finalized by the project leadership team."
    val = EntityValidator.validate_entities(orig, rewr)
    assert val['passed'] is False
    assert len(val['missing_entities']) > 0

def test_numerical_preservation_success():
    orig = "The budget increased by 15% to $450,000 for FY2027."
    rewr = "For FY2027, the allocated budget increased 15% to reach $450,000."
    val = EntityValidator.validate_numbers(orig, rewr)
    assert val['passed'] is True

def test_numerical_preservation_failure_detected():
    orig = "The budget increased by 15% to $450,000."
    rewr = "The budget increased to $500,000."
    val = EntityValidator.validate_numbers(orig, rewr)
    assert val['passed'] is False
    # Missing $450,000 and added $500,000
    assert len(val['missing_numbers']) > 0 or len(val['new_numbers']) > 0

def test_negation_inversion_detected():
    orig = "Do not deploy the database migration until testing completes."
    rewr = "Deploy the database migration now that testing is scheduled."
    val = ConstraintValidator.validate_negation(orig, rewr)
    assert val['passed'] is False
    assert val['severity'] == 'high'

def test_negation_synonym_prohibition_accepted():
    orig = "Do not submit sensitive keys."
    rewr = "Refrain from submitting sensitive keys."
    val = ConstraintValidator.validate_negation(orig, rewr)
    # Refrain is recognized as prohibitive term
    assert val['passed'] is True

def test_obligation_softening_detected():
    orig = "All developers must encrypt production credentials at rest."
    rewr = "Developers may encrypt production credentials if convenient."
    val = ConstraintValidator.validate_obligations(orig, rewr)
    assert val['passed'] is False
    assert 'Softened' in (val['warning'] or '')

def test_validation_service_orchestration():
    orig = "Sarah must send the $200k report by Friday."
    rewr = "Sarah will send the $200k report by Friday."
    report = ValidationService.validate_transformation(orig, rewr)
    assert 'risk_level' in report
    assert 'semantic_similarity' in report
    assert report['entity_check']['passed'] is True
    assert report['number_check']['passed'] is True
