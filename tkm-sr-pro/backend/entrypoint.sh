#!/bin/bash

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
while ! nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL started"

# Wait for Elasticsearch
echo "Waiting for Elasticsearch..."
while ! nc -z es 9200; do
  sleep 1
done
echo "Elasticsearch started"

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files (if needed)
# echo "Collecting static files..."
# python manage.py collectstatic --noinput

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
