#!/bin/bash

# Ensure uv is available
if ! command -v uv &> /dev/null
then
    echo "uv could not be found. Please install uv: https://github.com/astral-sh/uv"
    exit 1
fi

# Create a virtual environment using uv (typically creates .venv)
echo "Creating Python virtual environment using uv..."
uv venv
if [ ! -d ".venv" ]; then
    echo "Failed to create virtual environment with uv."
    exit 1
fi

# Activate the virtual environment (uv automatically uses .venv if present)
# No explicit source command is typically needed if running uv commands in the same directory.
# For running python scripts directly, you might still source it:
# source .venv/bin/activate

# Install required packages using uv
echo "Installing dependencies using uv..."
uv pip install flask flask-cors psutil pymediainfo pysmb requests

# Output success message
echo "Dependencies installed successfully using uv!"
echo "To activate the virtual environment for running Python scripts directly, run:"
echo "source .venv/bin/activate"
echo "Alternatively, you can run scripts via 'uv run python_script.py'"
