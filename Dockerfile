# Member 4 AI Intelligence Subsystem
# Docker Container Definition

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system runtime dependencies for OpenCV and video decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Create evidence and data directories
RUN mkdir -p data/evidence evidence_store

EXPOSE 8000

# Default command: launch Member 4 integration server
CMD ["python", "-m", "ai_subsystem.adapters.api_service"]
