FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-wheel \
    git \
    libgeos-dev \
    libproj-dev \
    proj-data \
    proj-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY . .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose the correct port
EXPOSE 10000

# 🛠️ Add timeout fix here
CMD ["gunicorn", "weather.app:app", "--bind", "0.0.0.0:10000", "--timeout", "120", "--workers", "1"]
