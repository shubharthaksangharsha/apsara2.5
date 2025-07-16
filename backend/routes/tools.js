// routes/tools.js
import express from 'express';
import { getToolDeclarations, toolHandlers, customToolNames } from '../services/tools/index.js';
import { handleCodeExecution } from '../services/tools/codeexecution/handlers.js';

const router = express.Router();

// Add this route to your existing router
router.post('/codeexecution', async (req, res) => {
  try {
    const result = await handleCodeExecution(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false, 
      error: error.message || 'Code execution failed'
    });
  }
});


// Get available tools
router.get('/', (req, res) => {
  // Get authentication-aware tool declarations
  const toolsToUse = getToolDeclarations(!!req.userTokens);
  res.json({ 
    tools: toolsToUse,
    isAuthenticated: req.isAuthenticated || false
  });
});

// Invoke a tool
router.post('/invoke', (req, res) => {
  const { toolName, args } = req.body;
  if (!toolHandlers[toolName]) return res.status(400).json({ error: 'Unknown tool.' });
  try { 
    console.log(`[Tool Invoke] Executing tool: ${toolName}`);
    const isGoogleTool = [
      'sendGmail', 'draftGmail', 'listGmailMessages', 'getGmailMessage',
      'listCalendarEvents', 'createCalendarEvent', 'getCalendarEvent'
    ].includes(toolName);
    
    let result;
    if (isGoogleTool) {
      if (!req.isAuthenticated || !req.userTokens) {
        return res.status(401).json({ 
          error: 'Authentication required for this tool.', 
          toolName 
        });
      }
      // Make sure args is defined and is an object
      const safeArgs = args && typeof args === 'object' ? args : {};
      console.log(`[Tool Invoke] Invoking Google tool ${toolName} with args:`, safeArgs);
      result = toolHandlers[toolName](req, safeArgs);
    } else {
      // For other tools, just pass the args
      result = toolHandlers[toolName](args || {});
    }
    
    res.json({ toolName, result });
  } catch(e) { 
    console.error(`[Tool Invoke] Error executing ${toolName}:`, e);
    res.status(500).json({ error: e.message }); 
  }
});

export default router;