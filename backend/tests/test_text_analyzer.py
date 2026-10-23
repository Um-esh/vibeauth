import pytest
from backend.app.ml.text_analyzer import TextAnalyzer

def test_text_analyzer_statistics():
    text = "Hello world! This is a test sentence. We are evaluating text stats."
    res = TextAnalyzer.analyze(text)
    
    assert res['text'] == text
    assert res['statistics']['word_count'] > 5
    assert res['statistics']['sentence_count'] == 3
    assert res['statistics']['readability_grade'] >= 1.0

def test_text_analyzer_extractions():
    text = "Please send $45,000 to Sarah Jenkins at sarah@example.com by Friday October 30 via https://pay.example.com."
    res = TextAnalyzer.analyze(text)
    
    # Check entities
    entities_lower = [e.lower() for e in res['extracted_entities']]
    assert any('sarah' in e for e in entities_lower)
    
    # Check numbers
    assert any('45,000' in n or '45000' in n for n in res['extracted_numbers'])
    
    # Check dates
    dates_str = ' '.join(res['extracted_dates']).lower()
    assert 'friday' in dates_str or 'october 30' in dates_str
    
    # Check contacts
    assert 'sarah@example.com' in res['emails']
    assert any('https://pay.example.com' in u for u in res['urls'])

def test_text_analyzer_empty():
    res = TextAnalyzer.analyze("")
    assert res['text'] == ""
    assert res['statistics']['word_count'] == 0
    assert len(res['extracted_entities']) == 0
