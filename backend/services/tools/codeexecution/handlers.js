// services/tools/codeexecution/handlers.js
/**
 * Handles Python code execution
 */
import { PythonDockerExecutor } from './dockerExecutor.js';

const pythonExecutor = new PythonDockerExecutor();

export async function handleCodeExecution({ code, files = [] }) {
  try {
    const result = await pythonExecutor.executeCode(code, files);
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      files: result.files,
      sessionId: result.sessionId
    };
  } catch (error) {
    console.error('Code execution error:', error);
    return {
      success: false,
      error: error.message || 'Execution failed'
    };
  }
}

export const codeexecutionToolHandlers = {
  codeExecution: handleCodeExecution
}; 