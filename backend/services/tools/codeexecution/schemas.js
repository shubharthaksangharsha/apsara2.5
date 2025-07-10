// services/tools/codeexecution/schemas.js
export const codeExecutionSchema = {
  name: 'codeExecution',
  description: 'Executes Python code to solve problems, analyze data, or perform calculations.',
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