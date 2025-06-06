import { useCallback } from 'react';

export const useToolHandlers = ({
  addLiveMessage,
  setWeatherUIData,
  setCalendarEvents,
  setCalendarEventsLastUpdated,
  setActiveTab
}) => {
  
  // Handle tool call started events
  const handleToolCallStarted = useCallback((calls) => {
    console.log("🛠️ [Live WS] Tool call started:", calls);
    // Add a system message for each tool call started
    calls?.forEach(call => addLiveMessage({ role: 'system', text: `⏳ Using tool: ${call.name}...`}));
  }, [addLiveMessage]);
  
  // Handle tool call results
  const handleToolCallResult = useCallback((name, result) => {
    console.log("✅ [Live WS] Tool call result:", name, result);
    addLiveMessage({ role: 'system', text: `✅ Tool ${name} result: ${JSON.stringify(result)}`});
    
    // Handle special tools
    if (name === 'getWeather' && result?._weatherGUIData) {
      console.log("🌦️ [Live WS - useLiveSession] Received weather GUI data:", result._weatherGUIData);
      setWeatherUIData(result._weatherGUIData);
    }
    
    if (name === 'listCalendarEvents' && result?.status === 'success' && Array.isArray(result.events)) {
      console.log("🗓️ [Live WS - useLiveSession] Received calendar events:", result.events);
      setCalendarEvents(result.events);
      setCalendarEventsLastUpdated(Date.now());
    } else if (name === 'listCalendarEvents' && result?.status !== 'success') {
      addLiveMessage({
        role: 'error', 
        text: `Error fetching calendar events: ${result?.message || 'Unknown error'}`
      });
      setCalendarEvents([]);
    }
    
    // Handle tab switching
    if (name === 'switchTab' && result?.status === 'success' && result?.tab) {
      console.log(`🔄 [Live WS] Tab switching requested to: ${result.tab}`);
      setActiveTab(result.tab);
      addLiveMessage({ role: 'system', text: `Switched to ${result.tab} tab.` });
    }
  }, [addLiveMessage, setWeatherUIData, setCalendarEvents, setCalendarEventsLastUpdated, setActiveTab]);
  
  // Handle tool call errors
  const handleToolCallError = useCallback((name, error) => {
    console.error("❌ [Live WS] Tool call error:", name, error);
    addLiveMessage({ role: 'error', text: `❌ Tool ${name} error: ${error}`});
  }, [addLiveMessage]);
  
  return {
    handleToolCallStarted,
    handleToolCallResult,
    handleToolCallError
  };
}; 