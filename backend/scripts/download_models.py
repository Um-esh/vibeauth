"""
Model Download and Offline Caching Script
Downloads Hugging Face sequence-to-sequence and embedding models to local disk
so the application can run 100% offline without any network access.
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] %(message)s')
logger = logging.getLogger('model_downloader')

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CACHE_DIR = BASE_DIR / 'models_cache'

# Model registry and estimates
MODEL_REGISTRY = {
    'flan-t5-small': {
        'hf_id': 'google/flan-t5-small',
        'type': 'seq2seq',
        'estimated_size_mb': 308,
        'license': 'Apache 2.0',
        'target_subfolder': 'generation_model'
    },
    'flan-t5-base': {
        'hf_id': 'google/flan-t5-base',
        'type': 'seq2seq',
        'estimated_size_mb': 990,
        'license': 'Apache 2.0',
        'target_subfolder': 'generation_model_base'
    },
    'all-MiniLM-L6-v2': {
        'hf_id': 'sentence-transformers/all-MiniLM-L6-v2',
        'type': 'embedding',
        'estimated_size_mb': 85,
        'license': 'Apache 2.0',
        'target_subfolder': 'embedding_model'
    }
}

def download_generation_model(model_key: str, dest_dir: Path):
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    
    meta = MODEL_REGISTRY[model_key]
    hf_id = meta['hf_id']
    save_path = dest_dir / meta['target_subfolder']
    save_path.mkdir(parents=True, exist_ok=True)
    
    logger.info("=" * 60)
    logger.info(f"Downloading Generation Model: {hf_id}")
    logger.info(f"License: {meta['license']} | Estimated Size: ~{meta['estimated_size_mb']} MB")
    logger.info(f"Target Directory: {save_path}")
    logger.info("=" * 60)
    
    logger.info("Downloading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(hf_id)
    tokenizer.save_pretrained(save_path)
    
    logger.info("Downloading model weights...")
    model = AutoModelForSeq2SeqLM.from_pretrained(hf_id)
    model.save_pretrained(save_path)
    
    logger.info("Verifying local offline load...")
    test_tokenizer = AutoTokenizer.from_pretrained(save_path, local_files_only=True)
    test_model = AutoModelForSeq2SeqLM.from_pretrained(save_path, local_files_only=True)
    logger.info(f"Verification successful: {hf_id} ready for offline inference.")
    return save_path

def download_embedding_model(dest_dir: Path):
    from sentence_transformers import SentenceTransformer
    
    meta = MODEL_REGISTRY['all-MiniLM-L6-v2']
    hf_id = meta['hf_id']
    save_path = dest_dir / meta['target_subfolder']
    save_path.mkdir(parents=True, exist_ok=True)
    
    logger.info("=" * 60)
    logger.info(f"Downloading Semantic Embedding Model: {hf_id}")
    logger.info(f"License: {meta['license']} | Estimated Size: ~{meta['estimated_size_mb']} MB")
    logger.info(f"Target Directory: {save_path}")
    logger.info("=" * 60)
    
    model = SentenceTransformer(hf_id)
    model.save(str(save_path))
    
    logger.info("Verifying offline load...")
    test_model = SentenceTransformer(str(save_path))
    logger.info("Verification successful: Embedding model ready for offline inference.")
    return save_path

def main():
    parser = argparse.ArgumentParser(description="Download and verify models for offline inference.")
    parser.add_argument(
        '--generation-model',
        choices=['flan-t5-small', 'flan-t5-base'],
        default='flan-t5-small',
        help="Generation model to download (default: flan-t5-small, ~308MB)"
    )
    parser.add_argument(
        '--skip-embeddings',
        action='store_true',
        help="Skip downloading sentence-transformers embeddings"
    )
    parser.add_argument(
        '--cache-dir',
        default=str(DEFAULT_CACHE_DIR),
        help="Target folder for storing model weights"
    )
    
    args = parser.parse_args()
    cache_path = Path(args.cache_dir)
    cache_path.mkdir(parents=True, exist_ok=True)
    
    print("\n[Instant Persona & Communication Transformer - Model Download]")
    print(f"Target Cache Directory: {cache_path}")
    
    # 1. Download Seq2Seq model
    gen_path = download_generation_model(args.generation_model, cache_path)
    
    # 2. Download Embedding model
    emb_path = None
    if not args.skip_embeddings:
        emb_path = download_embedding_model(cache_path)
        
    print("\n" + "=" * 60)
    print("ALL MODELS DOWNLOADED AND VERIFIED SUCCESSFULLY!")
    print(f"Generation Model Path: {gen_path}")
    if emb_path:
        print(f"Embedding Model Path:  {emb_path}")
    print("You can now safely set OFFLINE_MODE=true in .env to disable all network access.")
    print("=" * 60 + "\n")

if __name__ == '__main__':
    main()
