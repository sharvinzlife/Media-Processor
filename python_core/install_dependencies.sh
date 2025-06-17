#!/bin/bash

# Python dependency installer with automatic fallback

# Check if uv is available
if command -v uv &> /dev/null; then
    echo "Using uv for Python dependency management..."
    
    # Create a virtual environment using uv
    echo "Creating Python virtual environment using uv..."
    uv venv
    if [ ! -d ".venv" ]; then
        echo "Failed to create virtual environment with uv."
        exit 1
    fi
    
    # Install required packages using uv
    echo "Installing dependencies using uv..."
    uv pip install -r requirements.txt
    
    echo "Dependencies installed successfully using uv!"
    echo "To activate the virtual environment, run: source .venv/bin/activate"
else
    echo "uv not found, falling back to standard pip..."
    
    # Check if we're already in a virtual environment
    if [[ "$VIRTUAL_ENV" != "" ]]; then
        echo "Using existing virtual environment: $VIRTUAL_ENV"
        pip install --upgrade pip
        pip install -r requirements.txt
    else
        # Try to use the existing venv if it exists
        if [ -d "venv" ] && [ -f "venv/bin/activate" ]; then
            echo "Found existing venv, using it..."
            source venv/bin/activate
            pip install --upgrade pip
            pip install -r requirements.txt
        elif [ -d ".venv" ] && [ -f ".venv/bin/activate" ]; then
            echo "Found existing .venv, using it..."
            source .venv/bin/activate
            pip install --upgrade pip
            pip install -r requirements.txt
        else
            echo "No virtual environment found. Creating one..."
            python3 -m venv venv
            source venv/bin/activate
            pip install --upgrade pip
            pip install -r requirements.txt
        fi
    fi
    
    echo "Dependencies installed successfully using pip!"
fi
