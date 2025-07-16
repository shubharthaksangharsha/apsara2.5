#!/bin/bash

echo "Testing Python environment in Docker container..."
echo "================================================="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create a temporary file path that works on Windows/MinGW
TEMP_FILE="${SCRIPT_DIR}/temp_test_libraries.py"

# Copy the test script to a temporary location
cp "${SCRIPT_DIR}/backend/services/tools/codeexecution/test_libraries.py" "${TEMP_FILE}"

# Run the test script in the Docker container with proper path mapping
docker run --rm -v "${TEMP_FILE}:/code/test_libraries.py" apsara-python-env python /code/test_libraries.py

# Clean up
rm "${TEMP_FILE}"

echo "================================================="
echo "Test completed." 