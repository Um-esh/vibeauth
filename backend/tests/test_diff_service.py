import pytest
from backend.app.ml.diff_service import DiffService

def test_diff_identical_text():
    text = "The quick brown fox jumps over the lazy dog."
    diff = DiffService.compute_diff(text, text)
    
    assert diff['words_added'] == 0
    assert diff['words_removed'] == 0
    assert diff['words_changed_percent'] == 0.0
    assert diff['word_count_delta'] == 0

def test_diff_complete_replacement():
    orig = "Alpha beta gamma"
    rewr = "One two three four"
    diff = DiffService.compute_diff(orig, rewr)
    
    assert diff['words_changed_percent'] == 100.0
    assert diff['words_added'] == 4
    assert diff['words_removed'] == 3

def test_diff_partial_edit():
    orig = "The project will launch on Friday."
    rewr = "The project will launch on Monday."
    diff = DiffService.compute_diff(orig, rewr)
    
    assert 0.0 < diff['words_changed_percent'] < 100.0
    assert diff['original_word_count'] == 6
    assert diff['rewritten_word_count'] == 6
    assert any(tok['type'] == 'replace' for tok in diff['rewritten_annotated'])

def test_diff_empty_input():
    diff = DiffService.compute_diff("", "")
    assert diff['original_word_count'] == 0
    assert diff['words_changed_percent'] == 0.0
