#!/bin/bash

echo "Testing Python environment in Docker container (Ubuntu/Linux)..."
echo "================================================================="

# Get script directory
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "Script directory: ${SCRIPT_DIR}"

# Find test_libraries.py file
TEST_FILE=""
POSSIBLE_PATHS=(
  "${SCRIPT_DIR}/backend/services/tools/codeexecution/test_libraries.py"
  "${SCRIPT_DIR}/apsara2.5/backend/services/tools/codeexecution/test_libraries.py"
)

for path in "${POSSIBLE_PATHS[@]}"; do
  if [ -f "$path" ]; then
    TEST_FILE="$path"
    echo "Found test file at: $TEST_FILE"
    break
  fi
done

if [ -z "$TEST_FILE" ]; then
  echo "Error: Could not find test_libraries.py in any of the expected locations"
  exit 1
fi

# Create a temporary directory and file for testing
TEMP_DIR="${SCRIPT_DIR}/temp_docker_test"
mkdir -p "${TEMP_DIR}"
TEMP_FILE="${TEMP_DIR}/test_libraries.py"

# Copy the test script to the temporary location
cp "$TEST_FILE" "$TEMP_FILE"
echo "Copied test file to: $TEMP_FILE"

# Run Docker with direct volume mapping (works on Linux)
echo "Running Docker with volume mapping..."
docker run --rm \
  -v "${TEMP_FILE}:/code/test_libraries.py" \
  apsara-python-env \
  python /code/test_libraries.py

# Alternative method: Use simplified embedded test
cat > "${TEMP_DIR}/docker_run.py" << 'EOL'
#!/usr/bin/env python3
print("=== Python Docker Container Test ===")
import sys
print(f"Python version: {sys.version}")
print("\nTesting library imports:")
libraries = ["numpy", "pandas", "matplotlib", "opencv-python", "pillow"]
for lib in libraries:
    try:
        if lib == "opencv-python":
            import cv2
            print(f"✓ {lib} (as cv2)")
        elif lib == "pillow":
            import PIL
            print(f"✓ {lib} (as PIL)")
        else:
            module_name = lib.replace('-', '_')
            exec(f"import {module_name}")
            print(f"✓ {lib}")
    except ImportError:
        print(f"✗ {lib}")
print("\nTest completed successfully!")
EOL

echo -e "\nRunning alternative test without volume mapping..."
docker run --rm apsara-python-env python -c "$(cat ${TEMP_DIR}/docker_run.py)"

# Clean up
rm -rf "${TEMP_DIR}"
echo "Temporary files removed"

echo "================================================================="
echo "Test completed." 