import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / 'instance'
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)

MODELS_CACHE_DIR = BASE_DIR / 'models_cache'
MODELS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

class Config:
    """Application configuration with environment-driven overrides."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'vibeath-instant-persona-secret-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{INSTANCE_DIR / "persona_transformer.sqlite3"}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ML & Model settings
    MODELS_DIR = Path(os.environ.get('MODELS_DIR', str(MODELS_CACHE_DIR)))
    GENERATION_MODEL_NAME = os.environ.get('GENERATION_MODEL_NAME', 'google/flan-t5-small')
    EMBEDDING_MODEL_NAME = os.environ.get('EMBEDDING_MODEL_NAME', 'sentence-transformers/all-MiniLM-L6-v2')
    
    # Offline mode enforcement
    OFFLINE_MODE = os.environ.get('OFFLINE_MODE', 'false').lower() in ('true', '1', 'yes')
    
    # Device: 'auto', 'cpu', or 'cuda'
    DEVICE = os.environ.get('DEVICE', 'cpu')
    
    # Input constraints
    MAX_INPUT_CHARS = int(os.environ.get('MAX_INPUT_CHARS', 2500))
    MAX_INPUT_WORDS = int(os.environ.get('MAX_INPUT_WORDS', 500))
    MAX_GENERATION_TOKENS = int(os.environ.get('MAX_GENERATION_TOKENS', 256))
    
    # CORS
    CORS_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ]

    # Max regeneration attempts for failed constraints
    MAX_REGENERATION_ATTEMPTS = int(os.environ.get('MAX_REGENERATION_ATTEMPTS', 1))
