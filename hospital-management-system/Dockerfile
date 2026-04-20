# Dockerfile for deploying the ML Backend (FastAPI) to Hugging Face Spaces or Render

# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (required for some ML libraries like scikit-image, opencv, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file from the backend folder
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory into the container's /app directory
COPY backend/ .

# Expose the port (7860 is the default for Hugging Face Spaces)
EXPOSE 7860

# Run the FastAPI application using uvicorn
# If PORT is provided by the platform (like Render), it uses that, otherwise defaults to 7860 (Hugging Face)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
