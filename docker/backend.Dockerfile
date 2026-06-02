# Use official PyTorch image with CUDA support or CPU fallback
FROM pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system dependencies
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    libsndfile1 \
    build-essential \
    && rm -rf /lib/apt/lists/*

# Copy configuration files
COPY requirements.txt .

# Install dependencies with pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code files
COPY . .

# Expose port and configure entrypoint
EXPOSE 8000

ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
