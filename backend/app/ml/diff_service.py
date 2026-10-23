import difflib
from typing import Dict, Any, List
from backend.app.utils.text_processing import tokenize_words

class DiffService:
    """
    Computes word-level and token-level differences between original and rewritten text.
    Provides precise change statistics and structured diff tokens for visual rendering.
    """

    @staticmethod
    def calculate_word_change_percentage(original_tokens: List[str], rewritten_tokens: List[str]) -> float:
        """
        Calculates the percentage of textual changes relative to original word count.
        
        Formula:
            Total Edits = (words_removed + words_added + modified_phrases)
            Word Change Percentage = min(100.0, (Total Edits / len(original_tokens)) * 100.0)
            
        Captures both deletions, substitutions, and structural/tone insertions.
        """
        if not original_tokens:
            return 100.0 if rewritten_tokens else 0.0
        
        matcher = difflib.SequenceMatcher(None, original_tokens, rewritten_tokens)
        added_words = 0
        removed_words = 0
        modified_phrases = 0
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'delete':
                removed_words += (i2 - i1)
            elif tag == 'insert':
                added_words += (j2 - j1)
            elif tag == 'replace':
                modified_phrases += 1
                removed_words += (i2 - i1)
                added_words += (j2 - j1)
                
        total_edits = removed_words + added_words + modified_phrases
        pct = (total_edits / len(original_tokens)) * 100.0
        return round(min(100.0, max(0.0, pct)), 1)

    @classmethod
    def compute_diff(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """
        Computes structured diff opcodes, token streams, and change metrics.
        """
        orig_words = tokenize_words(original_text)
        rewr_words = tokenize_words(rewritten_text)
        
        orig_count = len(orig_words)
        rewr_count = len(rewr_words)
        
        matcher = difflib.SequenceMatcher(None, orig_words, rewr_words)
        opcodes = matcher.get_opcodes()
        
        added_words = 0
        removed_words = 0
        modified_phrases = 0
        
        # Token-by-token diff stream for UI rendering
        # Types: 'equal', 'insert', 'delete', 'replace'
        inline_tokens = []
        original_tokens_annotated = []
        rewritten_tokens_annotated = []
        
        for tag, i1, i2, j1, j2 in opcodes:
            orig_slice = orig_words[i1:i2]
            rewr_slice = rewr_words[j1:j2]
            
            if tag == 'equal':
                for w in orig_slice:
                    inline_tokens.append({'type': 'equal', 'text': w})
                    original_tokens_annotated.append({'type': 'equal', 'text': w})
                    rewritten_tokens_annotated.append({'type': 'equal', 'text': w})
            elif tag == 'delete':
                removed_words += len(orig_slice)
                for w in orig_slice:
                    inline_tokens.append({'type': 'delete', 'text': w})
                    original_tokens_annotated.append({'type': 'delete', 'text': w})
            elif tag == 'insert':
                added_words += len(rewr_slice)
                for w in rewr_slice:
                    inline_tokens.append({'type': 'insert', 'text': w})
                    rewritten_tokens_annotated.append({'type': 'insert', 'text': w})
            elif tag == 'replace':
                modified_phrases += 1
                removed_words += len(orig_slice)
                added_words += len(rewr_slice)
                for w in orig_slice:
                    inline_tokens.append({'type': 'delete', 'text': w})
                    original_tokens_annotated.append({'type': 'replace', 'text': w})
                for w in rewr_slice:
                    inline_tokens.append({'type': 'insert', 'text': w})
                    rewritten_tokens_annotated.append({'type': 'replace', 'text': w})
                    
        words_changed_percent = cls.calculate_word_change_percentage(orig_words, rewr_words)
        
        return {
            'original_word_count': orig_count,
            'rewritten_word_count': rewr_count,
            'word_count_delta': rewr_count - orig_count,
            'words_added': added_words,
            'words_removed': removed_words,
            'modified_phrases_count': modified_phrases,
            'words_changed_percent': words_changed_percent,
            'inline_tokens': inline_tokens,
            'original_annotated': original_tokens_annotated,
            'rewritten_annotated': rewritten_tokens_annotated,
            'formula_explanation': 'words_changed_percent = min(100.0, (words_removed + words_added + modified_phrases) / original_word_count * 100)'
        }
