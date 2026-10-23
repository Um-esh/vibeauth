# ==============================================================================
# Multi-Stage Dockerfile for Instant Persona & Communication Transformer
# Builds React Frontend + Packages Python Flask Backend with PyTorch CPU
# ==============================================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Python Image ---
FROM python:3.12-slim
WORKDIR /app

# Set non-interactive and environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=5000

# Install minimal OS build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU directly for fast caching & small image footprint
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy built React frontend static assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend codebase
COPY backend/ ./backend/
COPY .env.example ./.env

# Pre-train lightweight classifiers & download ML models into image cache so runtime is 100% offline
RUN python backend/scripts/train_classifier.py || true
RUN python backend/scripts/download_models.py || true

# Expose container port
EXPOSE 5000

# Run Gunicorn production server with threading support for ML inference
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 2 --worker-tmp-dir /dev/shm --timeout 180 backend.run:app"]
