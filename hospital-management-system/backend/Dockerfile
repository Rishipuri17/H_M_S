# Dockerfile for deploying the ML Backend (FastAPI) to Hugging Face Spaces or Render

# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Assuming you uploaded everything right into the main repo folder
# Copy the requirements file directly
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the rest of the backend files into the container
COPY . .

# Expose the port (7860 is the default for Hugging Face Spaces)
EXPOSE 7860

# Run the FastAPI application using uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
