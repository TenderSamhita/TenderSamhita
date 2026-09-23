FROM python:3.10-slim

WORKDIR /app

# System deps for PyMuPDF, opencv, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev musl-dev \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY config/ config/
COPY src/ src/
COPY frontend/dist/ frontend/dist/
COPY data/bis.db data/bis.db
COPY data/indexes/ data/indexes/
COPY data/processed/json/ data/processed/json/
COPY data/processed/figures/ data/processed/figures/

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
