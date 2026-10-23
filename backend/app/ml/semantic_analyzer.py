import numpy as np
from typing import Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.ml.model_manager import get_model_manager
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('semantic_analyzer')

class SemanticAnalyzer:
    """
    Computes semantic similarity between original and rewritten texts using
    either local SentenceTransformer dense embeddings or TF-IDF cosine similarity.
    """

    @classmethod
    def compute_similarity(cls, original_text: str, rewritten_text: str) -> Dict[str, Any]:
        """
        Calculates a semantic similarity score between 0.0 and 1.0.
        Returns the score, method used, and diagnostic heuristic note.
        """
        if not original_text or not rewritten_text:
            return {
                'similarity_score': 0.0,
                'method': 'empty_input',
                'explanation': 'Empty text provided; semantic similarity cannot be computed.'
            }

        if original_text.strip() == rewritten_text.strip():
            return {
                'similarity_score': 1.0,
                'method': 'exact_match',
                'explanation': 'Texts are identical.'
            }

        mm = get_model_manager()
        
        # 1. Try dense sentence transformer embedding
        if mm.embedding_model is not None:
            try:
                embeddings = mm.embedding_model.encode(
                    [original_text, rewritten_text],
                    convert_to_numpy=True,
                    normalize_embeddings=True
                )
                # Dot product of normalized vectors equals cosine similarity
                score = float(np.dot(embeddings[0], embeddings[1]))
                score = round(max(0.0, min(1.0, score)), 3)
                
                return {
                    'similarity_score': score,
                    'method': 'sentence-transformers (all-MiniLM-L6-v2)',
                    'model_name': 'all-MiniLM-L6-v2',
                    'explanation': 'Cosine similarity over dense 384-dimensional sentence embeddings. Note: Heuristic indicator, not formal proof of factual equivalence.'
                }
            except Exception as e:
                logger.warning(f"Error computing dense embeddings ({e}). Falling back to TF-IDF cosine similarity.")

        # 2. Fallback: TF-IDF cosine similarity
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([original_text, rewritten_text])
            score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
            score = round(max(0.0, min(1.0, score)), 3)
            
            return {
                'similarity_score': score,
                'method': 'tf-idf_cosine_similarity',
                'model_name': 'scikit-learn TfidfVectorizer',
                'explanation': 'Cosine similarity over word/bigram TF-IDF vectors (lexical overlap heuristic).'
            }
        except Exception as e:
            logger.error(f"Error computing TF-IDF similarity: {e}")
            return {
                'similarity_score': 0.5,
                'method': 'fallback_default',
                'explanation': 'Could not compute similarity score due to processing error.'
            }
