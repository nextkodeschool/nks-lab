# Use a small official Python image for the FastAPI backend.
FROM python:3.12-slim

# Do not create .pyc files, and print logs immediately.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the folder where backend commands will run.
WORKDIR /app

# Install Python dependencies first so Docker can cache this layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI application code.
COPY app ./app

# FastAPI listens on port 8000 inside the container.
EXPOSE 8000

# Start the API server and listen on all container network interfaces.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
