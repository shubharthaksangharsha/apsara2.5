// services/tools/codeexecution/handlers.js
/**
 * Handles Python code execution
 */
export async function handleCodeExecution({ code }) {
  try {
    console.log(`[Tool: codeExecution] Processing${code ? ' provided code' : ' without explicit code'}`);
    
    // Import Gemini client
    const { getGeminiClient } = await import('../../ai/client.js');
    const ai = await getGeminiClient();
    
    // If no code was provided, use a simple prompt to demonstrate the tool
    const prompt = code 
      ? `Execute this Python code and return the result: ${code}`
      : "Write and execute Python code that prints 'Hello, World!' and calculates the first 10 Fibonacci numbers";
    
    // Call Gemini API with code execution tool enabled
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{codeExecution: {}}],
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    });
    
    // Extract all parts from the response
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    // Collect the different content types
    let textContent = '';
    let executedCode = '';
    let codeResults = '';
    
    for (const part of parts) {
      if (part.text) {
        textContent += part.text + '\n';
      }
      if (part.executableCode && part.executableCode.code) {
        executedCode += part.executableCode.code + '\n';
      }
      if (part.codeExecutionResult && part.codeExecutionResult.output) {
        codeResults += part.codeExecutionResult.output + '\n';
      }
    }
    
    console.log(`[Tool: codeExecution] Execution completed. Text length: ${textContent.length}, Code length: ${executedCode.length}, Results length: ${codeResults.length}`);
    
    return {
      explanation: textContent.trim(),
      code: executedCode.trim(),
      output: codeResults.trim(),
      successful: !codeResults.includes('Error') && !codeResults.includes('Exception')
    };
  } catch (error) {
    console.error(`[Tool: codeExecution] Error during execution: ${error}`);
    return {
      error: `Failed to execute code: ${error.message}`
    };
  }
}

export const codeexecutionToolHandlers = {
  codeExecution: handleCodeExecution
}; 