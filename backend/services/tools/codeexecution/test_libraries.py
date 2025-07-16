#!/usr/bin/env python3

"""
Test script to verify the availability of all required Python libraries
in the Docker container.
"""

import sys

def check_libraries():
    """Test import of all required libraries."""
    libraries = [
        "attrs",
        "chess",
        "contourpy",
        "fpdf",
        "geopandas",
        "imageio",
        "jinja2",
        "joblib",
        "jsonschema",
        "lxml",
        "matplotlib",
        "mpmath",
        "numpy",
        "opencv-python",
        "openpyxl",
        "packaging",
        "pandas",
        "pillow",
        "protobuf",
        "pylatex",
        "pyparsing",
        "PyPDF2",
        "python-dateutil",
        "python-docx",
        "python-pptx",
        "reportlab",
        "scikit-learn",
        "scipy",
        "seaborn",
        "six",
        "striprtf",
        "sympy",
        "tabulate",
        "toolz",
        "xlrd"
    ]
    
    missing = []
    installed = []
    
    # Test each library
    for lib in libraries:
        try:
            if lib == "opencv-python":
                import cv2
                installed.append(f"{lib} (as cv2)")
            elif lib == "pillow":
                import PIL
                installed.append(f"{lib} (as PIL)")
            elif lib == "PyPDF2":
                import PyPDF2
                installed.append(lib)
            elif lib == "python-docx":
                import docx
                installed.append(f"{lib} (as docx)")
            elif lib == "python-pptx":
                import pptx
                installed.append(f"{lib} (as pptx)")
            else:
                # Convert hyphenated names to underscore
                module_name = lib.replace('-', '_')
                exec(f"import {module_name}")
                installed.append(lib)
        except ImportError:
            missing.append(lib)
    
    # Print results
    print("=== Python Library Availability Test ===")
    print(f"Python version: {sys.version}")
    print(f"\n✓ Available Libraries ({len(installed)}):")
    for lib in installed:
        print(f"  - {lib}")
    
    if missing:
        print(f"\n✗ Missing Libraries ({len(missing)}):")
        for lib in missing:
            print(f"  - {lib}")
        print("\nSome libraries are missing. Update your Dockerfile or requirements.txt.")
    else:
        print("\nAll libraries are available! ✓")
    
    # Test file access to /mnt/data directory
    try:
        import os
        if os.path.exists("/code/mnt/data"):
            print("\n/code/mnt/data directory: Available ✓")
            # Create a test file
            test_file = "/code/mnt/data/test_file.txt"
            with open(test_file, "w") as f:
                f.write("Hello from Python container!")
            print(f"Test file created at: {test_file}")
        else:
            print("\n/code/mnt/data directory: Not found ✗")
    except Exception as e:
        print(f"\nError testing /mnt/data access: {str(e)}")

if __name__ == "__main__":
    check_libraries() 