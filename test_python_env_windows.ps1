# PowerShell script for testing Python environment in Docker on Windows
Write-Output "Testing Python environment in Docker container (Windows PowerShell)..."
Write-Output "================================================================="

# Get script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Output "Script directory: $SCRIPT_DIR"

# Find test_libraries.py file
$TEST_FILE = $null
$POSSIBLE_PATHS = @(
  "$SCRIPT_DIR\backend\services\tools\codeexecution\test_libraries.py",
  "$SCRIPT_DIR\apsara2.5\backend\services\tools\codeexecution\test_libraries.py"
)

foreach ($path in $POSSIBLE_PATHS) {
  if (Test-Path $path) {
    $TEST_FILE = $path
    Write-Output "Found test file at: $TEST_FILE"
    break
  }
}

if (-not $TEST_FILE) {
  Write-Output "Error: Could not find test_libraries.py in any of the expected locations"
  exit 1
}

# Create a temporary file in the script directory
$TEMP_FILE = Join-Path $SCRIPT_DIR "temp_test_libraries.py"

# Copy the test script to the temporary location
Copy-Item $TEST_FILE $TEMP_FILE -Force
Write-Output "Copied test file to: $TEMP_FILE"

# Run Docker with the temp file mounted
Write-Output "Running Docker container..."
docker run --rm -v "${TEMP_FILE}:/code/test_libraries.py" apsara-python-env python /code/test_libraries.py

# Clean up
Remove-Item -Path $TEMP_FILE -Force
Write-Output "Temporary file removed"

Write-Output "================================================================="
Write-Output "Test completed." 