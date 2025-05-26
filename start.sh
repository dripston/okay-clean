#!/bin/bash

# Run the prediction script first
echo "Running initial prediction script..."
cd weather
python -m models.main_prediction
echo "Initial prediction completed"

# Then start the web server
echo "Starting web server..."
cd ..
gunicorn --chdir weather app:app