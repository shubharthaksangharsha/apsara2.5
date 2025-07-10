import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, Map, CloudLightning, Battery, Camera, FileText, BookOpen, ChevronDown, Clock, Search, Globe, LayoutDashboard, Loader2, Check, ImageIcon } from 'lucide-react';
import { BACKEND_URL } from '../../hooks/common-constants';

/**
 * Plugin Manager component that displays available plugins in a modal
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the plugin manager is open
 * @param {Function} props.onClose - Close handler
 * @param {boolean} props.enableFunctionCalling - Whether function calling is enabled
 * @param {Function} props.onEnableFunctionCallingChange - Function calling toggle handler
 * @param {Array} props.selectedTools - Array of selected tool names
 * @param {Function} props.onSelectedToolsChange - Handler for selected tools change
 * @param {string} props.functionCallingMode - Current function calling mode
 * @param {Function} props.onFunctionCallingModeChange - Function calling mode change handler
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @returns {JSX.Element} Plugin manager component
 */
export default function PluginManager({
  isOpen,
  onClose,
  enableFunctionCalling,
  onEnableFunctionCallingChange,
  selectedTools,
  onSelectedToolsChange,
  functionCallingMode,
  onFunctionCallingModeChange,
  isAuthenticated
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [availableTools, setAvailableTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available tools from the backend
  useEffect(() => {
    if (!isOpen) return;

    const fetchTools = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${BACKEND_URL}/tools`);
        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAvailableTools(data.tools || []);
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [isOpen, isAuthenticated]);

  // Handle modal open/close animation
  React.useEffect(() => {
    let timeoutId;
    if (isOpen) {
      timeoutId = setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Handle overlay click to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Toggle function calling
  const handleFunctionCallingToggle = () => {
    const newValue = !enableFunctionCalling;
    onEnableFunctionCallingChange(newValue);
    
    // If disabling, clear selected tools
    if (!newValue) {
      onSelectedToolsChange([]);
    }
  };

  // Toggle a specific tool
  const toggleTool = (toolName) => {
    if (selectedTools.includes(toolName)) {
      onSelectedToolsChange(selectedTools.filter(t => t !== toolName));
    } else {
      onSelectedToolsChange([...selectedTools, toolName]);
    }
  };

  // Toggle all tools in a category
  const toggleCategory = (category, tools) => {
    const allToolsInCategory = tools.map(t => t.name);
    const allSelected = allToolsInCategory.every(tool => selectedTools.includes(tool));
    
    if (allSelected) {
      // If all are selected, deselect all in this category
      onSelectedToolsChange(selectedTools.filter(t => !allToolsInCategory.includes(t)));
    } else {
      // Otherwise, select all in this category
      const newSelectedTools = [...selectedTools];
      allToolsInCategory.forEach(tool => {
        if (!newSelectedTools.includes(tool)) {
          newSelectedTools.push(tool);
        }
      });
      onSelectedToolsChange(newSelectedTools);
    }
  };

  // Check if all tools in a category are selected
  const isCategoryEnabled = (tools) => {
    return tools.length > 0 && tools.every(tool => selectedTools.includes(tool.name));
  };

  // Filter out test tools that should be removed
  const filterTestTools = (tools) => {
    const testToolNames = [
      'powerDiscoBall', 
      'startMusic', 
      'dimLights', 
      'setRoomTemperature', 
      'getRoomSensors'
    ];
    
    return tools.filter(tool => !testToolNames.includes(tool.name));
  };

  // Group tools by category and bundle related tools
  const groupToolsByCategory = (tools) => {
    // Filter out test tools first
    const filteredTools = filterTestTools(tools);
    
    // Define categories with their icons
    const categories = {
      core: { 
        name: 'Core Functions', 
        icon: <Clock className="h-5 w-5" />, 
        tools: [] 
      },
      googleWorkspace: { 
        name: 'Google Workspace', 
        icon: <Mail className="h-5 w-5" />, 
        tools: [],
        onlyWhenAuthenticated: true
      },
      weather: { 
        name: 'Weather', 
        icon: <CloudLightning className="h-5 w-5" />, 
        tools: [] 
      },
      images: { 
        name: 'Image Generation', 
        icon: <ImageIcon className="h-5 w-5" />, 
        tools: [] 
      },
      notes: { 
        name: 'Notes', 
        icon: <FileText className="h-5 w-5" />, 
        tools: [] 
      },
      ui: { 
        name: 'UI Functions', 
        icon: <LayoutDashboard className="h-5 w-5" />, 
        tools: [] 
      },
      other: { 
        name: 'Other', 
        icon: <Globe className="h-5 w-5" />, 
        tools: [] 
      }
    };

    // Sort tools into categories
    filteredTools.forEach(tool => {
      const toolName = tool.name.toLowerCase();
      
      // Google Workspace tools (Gmail, Calendar, Maps)
      if (toolName.includes('gmail') || toolName.includes('calendar')) {
        categories.googleWorkspace.tools.push(tool);
      } 
      // Maps tools - also part of Google Workspace when authenticated
      else if (toolName.includes('map')) {
        categories.googleWorkspace.tools.push(tool);
      } 
      // Weather tools
      else if (toolName.includes('weather')) {
        categories.weather.tools.push(tool);
      } 
      // Core tools
      else if (toolName.includes('time') || toolName.includes('search') || toolName === 'echo' || toolName === 'getbatterystatus') {
        categories.core.tools.push(tool);
      } 
      // Image generation tools
      else if (toolName.includes('image') || toolName === 'generateimage' || toolName === 'editimage') {
        categories.images.tools.push(tool);
      }
      // Notes tools
      else if (toolName.includes('note')) {
        categories.notes.tools.push(tool);
      } 
      // UI tools
      else if (toolName.includes('screenshot') || toolName.includes('switchtab')) {
        categories.ui.tools.push(tool);
      } 
      // Other tools
      else {
        categories.other.tools.push(tool);
      }
    });

    // Filter out empty categories and those that require authentication when not authenticated
    return Object.values(categories).filter(category => {
      // Skip categories with no tools
      if (category.tools.length === 0) return false;
      
      // Always show Google Workspace if function calling is enabled
      // This fixes the issue where Google Workspace doesn't show up even when signed in
      if (category.name === 'Google Workspace') {
        return enableFunctionCalling;
      }
      
      // For other categories, just check if they have tools
      return true;
    });
  };

  // Function calling mode options
  const functionModes = [
    { value: 'auto', label: 'Auto', description: 'Let the model decide when to call the plugin' },
    { value: 'any', label: 'Any', description: 'Allow the model to call any plugin each time' },
    { value: 'none', label: 'None', description: 'Disable plugin calling' }
  ];

  // Get tool categories
  const toolCategories = groupToolsByCategory(availableTools);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[70] transition-opacity duration-300 ease-in-out ${isOpen && isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl flex flex-col max-h-[90vh] transform transition-transform duration-300 ease-in-out ${isOpen && isVisible ? 'translate-y-0' : 'translate-y-8'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Plugin Manager</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close plugin manager"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Enable/Disable All Plugins */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">Enable Plugins</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Allow the model to use tools and functions</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={enableFunctionCalling}
              onChange={handleFunctionCallingToggle}
            />
            <div className={`w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
          </label>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex-1 p-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error loading plugins: {error}
              </p>
            </div>
          </div>
        )}

        {/* Plugin Cards */}
        {!loading && !error && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {availableTools.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No plugins available
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {toolCategories.map((category) => (
                  <div 
                    key={category.name}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        {category.icon}
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">{category.name}</h3>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={isCategoryEnabled(category.tools)}
                          onChange={() => toggleCategory(category.name, category.tools)}
                          disabled={!enableFunctionCalling}
                        />
                        <div className={`w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${!enableFunctionCalling ? 'opacity-50' : ''}`}></div>
                      </label>
                    </div>

                    {/* Category Tools */}
                    <div className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {category.name === 'Notes' && 'Save and access notes during your conversations.'}
                        {category.name === 'Image Generation' && 'Create and edit images using AI.'}
                        {category.name === 'Google Workspace' && 'Access your emails, calendar events, and maps.'}
                        {category.name === 'Weather' && 'Get current weather information for any location.'}
                        {category.name === 'Core Functions' && 'Basic utilities for time, search, and system information.'}
                        {category.name === 'UI Functions' && 'Interact with the user interface.'}
                      </p>
                      
                      <div className="space-y-3">
                        {category.tools.map((tool) => (
                          <div key={tool.name} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{tool.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{tool.description || 'No description available'}</p>
                            </div>
                            <div className="ml-2 hidden">
                              <input 
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-green-500 rounded border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-500"
                                checked={selectedTools.includes(tool.name)}
                                onChange={() => toggleTool(tool.name)}
                                disabled={!enableFunctionCalling}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer with Function Calling Mode */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Plugins behavior: {functionCallingMode.toUpperCase()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {functionCallingMode === 'auto' ? 'Model decides when to use plugins' :
                 functionCallingMode === 'any' ? 'Model can use any plugin each time' :
                 'Plugins are disabled'}
              </p>
            </div>
            <div className="relative">
              <select
                value={functionCallingMode}
                onChange={(e) => onFunctionCallingModeChange(e.target.value)}
                className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={!enableFunctionCalling}
              >
                {functionModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 