#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install required packages
echo "Installing required packages..."
pip install locust==2.24.0 psycopg2-binary==2.9.9 boto3==1.35.76

echo "Setup complete! To run locust:"
echo "1. First activate the virtual environment:"
echo "   source venv/bin/activate"
echo "2. Then run locust:"
echo "   cd locust && locust -f locustfile.py"
