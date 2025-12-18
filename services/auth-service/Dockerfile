FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including build tools for bcrypt
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    libffi-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5001

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]

