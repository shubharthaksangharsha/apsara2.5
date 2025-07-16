@echo off
echo Testing Python environment in Docker container...
echo =================================================

REM Get script directory
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
REM echo Script directory: %SCRIPT_DIR%

REM Find test libraries file
set TEST_FILE=%SCRIPT_DIR%\backend\services\tools\codeexecution\test_libraries.py
if not exist "%TEST_FILE%" (
  set TEST_FILE=%SCRIPT_DIR%\apsara2.5\backend\services\tools\codeexecution\test_libraries.py
)

REM Create a temporary file
set TEMP_FILE=%SCRIPT_DIR%\temp_test_libraries.py

REM Copy the test file
copy "%TEST_FILE%" "%TEMP_FILE%" >nul
echo         1 file(s) copied.

REM Run the Docker container
echo Running Docker container...
docker run --rm -v "%TEMP_FILE%:/code/test_libraries.py" apsara-python-env python /code/test_libraries.py

REM Clean up
del "%TEMP_FILE%" 2>nul

echo =================================================
echo Test completed. 