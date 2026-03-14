FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default env vars (override at runtime)
ENV TUMOR_CHECKPOINT=/app/checkpoints/best_model.pth
ENV TUMOR_DEVICE=cpu
ENV AI_PORT=8000

EXPOSE 8000

CMD ["python", "main.py"]
