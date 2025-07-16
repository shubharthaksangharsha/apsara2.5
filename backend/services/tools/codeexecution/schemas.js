// services/tools/codeexecution/schemas.js
export const codeExecutionSchema = {
  name: 'codeExecution',
  description: 'Executes Python code to solve problems, analyze data, or perform calculations. The available libraries are: attrs, chess, contourpy, fpdf, geopandas, imageio, jinja2, joblib, jsonschema, lxml, matplotlib, mpmath, numpy, opencv-python (as cv2), openpyxl, packaging, pandas, pillow (as PIL), pylatex, pyparsing, PyPDF2, python-docx (as docx), python-pptx (as pptx), reportlab, scipy, seaborn, six, striprtf, sympy, tabulate, toolz, xlrd',
  parameters: {
    type: 'OBJECT',
    properties: {
      code: { type: 'STRING', description: 'Optional. The Python code to execute. If not provided, the model will generate code based on the task.' }
    }
  }
};

export const codeexecutionToolSchemas = [
  codeExecutionSchema
]; 