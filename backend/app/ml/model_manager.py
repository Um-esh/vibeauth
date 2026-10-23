import os
import sys
import torch
import joblib
from pathlib import Path
from typing import Optional, Dict, Any
from backend.app.config import Config
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('model_manager')

class ModelManager:
    """
    Centralized singleton manager for all local ML model weights, tokenizers,
    and pipelines. Enforces single-instance worker loading, offline operation,
    device configuration, and transparent error reporting.
    """
    _instance: Optional['ModelManager'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, '_initialized', False):
            return
        
        self.device = self._detect_device()
        self.tokenizer = None
        self.generation_model = None
        self.embedding_model = None
        self.intent_classifier = None
        self.formality_classifier = None
        
        self.generation_model_path: Optional[Path] = None
        self.embedding_model_path: Optional[Path] = None
        self.intent_model_path: Optional[Path] = None
        self.formality_model_path: Optional[Path] = None
        
        self.offline_mode = Config.OFFLINE_MODE
        
        # Resolve model paths
        self._resolve_paths()
        self._load_classifiers()
        self._load_embedding_model()
        self._load_generation_model()
        
        self._initialized = True
        logger.info(f"ModelManager initialized on device: {self.device} (Offline Mode: {self.offline_mode})")

    def _detect_device(self) -> torch.device:
        cfg_device = Config.DEVICE.lower()
        if cfg_device == 'cuda' and torch.cuda.is_available():
            return torch.device('cuda')
        elif cfg_device == 'auto' and torch.cuda.is_available():
            return torch.device('cuda')
        return torch.device('cpu')

    def _resolve_paths(self):
        cache_dir = Config.MODELS_DIR
        
        # Generation model folder (e.g. models_cache/generation_model)
        gen_dir = cache_dir / 'generation_model'
        if gen_dir.exists() and (gen_dir / 'config.json').exists():
            self.generation_model_path = gen_dir
        else:
            self.generation_model_path = None
            
        # Embedding model folder
        emb_dir = cache_dir / 'embedding_model'
        if emb_dir.exists():
            self.embedding_model_path = emb_dir
        else:
            self.embedding_model_path = None
            
        # Classifiers
        joblib_dir = cache_dir / 'joblib'
        intent_p = joblib_dir / 'intent_classifier.joblib'
        formality_p = joblib_dir / 'formality_classifier.joblib'
        
        if intent_p.exists():
            self.intent_model_path = intent_p
        if formality_p.exists():
            self.formality_model_path = formality_p

    def _load_classifiers(self):
        """Loads scikit-learn intent and formality classifiers."""
        if self.intent_model_path and self.intent_model_path.exists():
            try:
                self.intent_classifier = joblib.load(self.intent_model_path)
                logger.info(f"Loaded Intent Classifier from {self.intent_model_path.name}")
            except Exception as e:
                logger.error(f"Failed to load Intent Classifier: {e}")
                self.intent_classifier = None
        else:
            logger.warning("Intent classifier artifact not found. Run scripts/train_classifier.py.")

        if self.formality_model_path and self.formality_model_path.exists():
            try:
                self.formality_classifier = joblib.load(self.formality_model_path)
                logger.info(f"Loaded Formality Classifier from {self.formality_model_path.name}")
            except Exception as e:
                logger.error(f"Failed to load Formality Classifier: {e}")
                self.formality_classifier = None
        else:
            logger.warning("Formality classifier artifact not found. Run scripts/train_classifier.py.")

    def _load_embedding_model(self):
        """Loads SentenceTransformer embedding model offline or prepares fallback."""
        try:
            from sentence_transformers import SentenceTransformer
            if self.embedding_model_path and self.embedding_model_path.exists():
                logger.info(f"Loading SentenceTransformer from local path: {self.embedding_model_path}")
                self.embedding_model = SentenceTransformer(str(self.embedding_model_path), device=str(self.device))
            elif not self.offline_mode:
                logger.info(f"Local embedding path not found. Loading {Config.EMBEDDING_MODEL_NAME}...")
                self.embedding_model = SentenceTransformer(Config.EMBEDDING_MODEL_NAME, device=str(self.device))
            else:
                logger.warning("Offline mode active and local embedding model files missing. Embedding model disabled.")
                self.embedding_model = None
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). TF-IDF similarity fallback will be used.")
            self.embedding_model = None

    def _load_generation_model(self):
        """Loads Hugging Face Seq2Seq model (FLAN-T5) locally."""
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

        source = None
        local_only = self.offline_mode
        
        if self.generation_model_path and self.generation_model_path.exists():
            source = str(self.generation_model_path)
            local_only = True
        elif not self.offline_mode:
            source = Config.GENERATION_MODEL_NAME
            local_only = False
        else:
            logger.error("OFFLINE_MODE is True but no local model weights found in models_cache/generation_model!")
            self.tokenizer = None
            self.generation_model = None
            return

        try:
            logger.info(f"Loading Seq2Seq Tokenizer from '{source}' (local_files_only={local_only})...")
            self.tokenizer = AutoTokenizer.from_pretrained(source, local_files_only=local_only)
            
            logger.info(f"Loading Seq2Seq Model from '{source}' on {self.device}...")
            self.generation_model = AutoModelForSeq2SeqLM.from_pretrained(source, local_files_only=local_only)
            self.generation_model.to(self.device)
            self.generation_model.eval()
            logger.info("Seq2Seq Generation Model successfully loaded and set to eval mode.")
        except Exception as e:
            logger.error(f"Critical error loading generation model from '{source}': {e}")
            self.tokenizer = None
            self.generation_model = None

    def get_status(self) -> Dict[str, Any]:
        """Returns health diagnostics and loaded model inventory."""
        self._resolve_paths()
        return {
            'device': str(self.device),
            'offline_mode': self.offline_mode,
            'generation_model_loaded': self.generation_model is not None,
            'generation_model_name': Config.GENERATION_MODEL_NAME,
            'generation_model_local_path': str(self.generation_model_path) if self.generation_model_path else None,
            'embedding_model_loaded': self.embedding_model is not None,
            'embedding_model_name': Config.EMBEDDING_MODEL_NAME,
            'embedding_model_local_path': str(self.embedding_model_path) if self.embedding_model_path else None,
            'intent_classifier_loaded': self.intent_classifier is not None,
            'formality_classifier_loaded': self.formality_classifier is not None,
            'cuda_available': torch.cuda.is_available()
        }

    def reload(self):
        """Forces reloading of all models."""
        self._resolve_paths()
        self._load_classifiers()
        self._load_embedding_model()
        self._load_generation_model()

# Global accessor
def get_model_manager() -> ModelManager:
    return ModelManager()
