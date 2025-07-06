// websocket/utils/logger.js - WebSocket-specific logging utilities

// Format a session ID for consistent logging
export function formatSessionId(session) {
  return session?.conn?.id?.substring(0, 8) ?? 'N/A';
}

// Log WebSocket connection state with emoji indicators
export function logConnectionState(sessionId, state) {
  const stateMap = {
    0: '🔄 CONNECTING',
    1: '✅ OPEN',
    2: '⏳ CLOSING',
    3: '❌ CLOSED'
  };
  
  console.log(`[Live Backend] Session <${sessionId}> state: ${stateMap[state] || `Unknown (${state})`}`);
}

// Log a critical error with visual emphasis
export function logCriticalError(sessionId, error) {
  console.error('');
  console.error(`🔥🔥🔥 [Live Backend] CRITICAL ERROR <${sessionId}> 🔥🔥🔥`);
  console.error(error);
  console.error('🔥🔥🔥 [Live Backend] End Critical Error 🔥🔥🔥');
  console.error('');
}
