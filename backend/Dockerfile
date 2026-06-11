# ArenaPulse backend — Cloud Run / container image
# Build from the backend/ directory:  docker build -t arenapulse-backend backend/
FROM python:3.12-slim


# Keep Python lean and unbuffered (logs flush immediately on Cloud Run)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# System deps kept minimal; most wheels are pure-Python or manylinux.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install deps first for layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# App code
COPY app ./app

# The trained ML model is OPTIONAL — SurgePredictor falls back to the
# heuristic when models/surge_predictor.joblib is absent (see CLAUDE.md).
# If you want the model baked in, COPY it into /models and set ML_MODEL_PATH.

EXPOSE 8000

# Cloud Run injects $PORT; default 8000 for local `docker run`.
# Use shell form so $PORT is expanded at runtime.
# --proxy-headers + --forwarded-allow-ips: trust X-Forwarded-Proto from the
# Railway/Cloud Run TLS proxy so redirects (e.g. FastAPI's 307 trailing-slash)
# point at https:// — browsers block http redirects from https pages.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips "*"
