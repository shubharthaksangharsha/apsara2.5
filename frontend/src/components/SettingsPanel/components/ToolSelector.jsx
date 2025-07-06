import React, { useState, useEffect } from 'react';
import { Settings, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { BACKEND_URL } from '../../../hooks/common-constants';

/**
 * Tool Selector Component for function calling settings
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.enableFunctionCalling - Whether function calling is enabled
 * @param {Function} props.onEnableFunctionCallingChange - Handler for function calling toggle
 * @param {Array} props.selectedTools - Array of selected tool names
 * @param {Function} props.onSelectedToolsChange - Handler for selected tools change
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @returns {JSX.Element} Tool selector component
 */
export default function ToolSelector({
  enableFunctionCalling,
  onEnableFunctionCallingChange,
  selectedTools,
  onSelectedToolsChange,
  isAuthenticated
}) {
  const [availableTools, setAvailableTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch available tools from backend
  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/tools`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

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
  }, [isAuthenticated]);

  // Handle function calling toggle
  const handleFunctionCallingToggle = (enabled) => {
    onEnableFunctionCallingChange(enabled);
    if (!enabled) {
      // Clear selected tools when disabling function calling
      onSelectedToolsChange([]);
    }
  };

  // Handle individual tool selection
  const handleToolToggle = (toolName) => {
    const isSelected = selectedTools.includes(toolName);
    let newSelectedTools;
    
    if (isSelected) {
      newSelectedTools = selectedTools.filter(name => name !== toolName);
    } else {
      newSelectedTools = [...selectedTools, toolName];
    }
    
    onSelectedToolsChange(newSelectedTools);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedTools.length === availableTools.length) {
      onSelectedToolsChange([]); // Deselect all
    } else {
      onSelectedToolsChange(availableTools.map(tool => tool.name)); // Select all
    }
  };

  // Group tools by category for better organization
  const groupToolsByCategory = (tools) => {
    const categories = {
      core: { name: 'Core Functions', tools: [] },
      google: { name: 'Google Services', tools: [] },
      weather: { name: 'Weather', tools: [] },
      ui: { name: 'UI Functions', tools: [] },
      notes: { name: 'Notes', tools: [] },
      other: { name: 'Other', tools: [] }
    };

    tools.forEach(tool => {
      const toolName = tool.name.toLowerCase();
      if (toolName.includes('gmail') || toolName.includes('calendar') || toolName.includes('map')) {
        categories.google.tools.push(tool);
      } else if (toolName.includes('weather')) {
        categories.weather.tools.push(tool);
      } else if (toolName.includes('time') || toolName.includes('search')) {
        categories.core.tools.push(tool);
      } else if (toolName.includes('ui') || toolName.includes('display')) {
        categories.ui.tools.push(tool);
      } else if (toolName.includes('note')) {
        categories.notes.tools.push(tool);
      } else {
        categories.other.tools.push(tool);
      }
    });

    // Filter out empty categories
    return Object.values(categories).filter(category => category.tools.length > 0);
  };

  const toolCategories = groupToolsByCategory(availableTools);

  return (
    <div className="space-y-3">
      {/* Function Calling Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-indigo-600" />
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Enable Function Calling
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow the model to use tools and functions
            </p>
          </div>
        </div>
        <button
          onClick={() => handleFunctionCallingToggle(!enableFunctionCalling)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            enableFunctionCalling ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enableFunctionCalling ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Tool Selection (only when function calling is enabled) */}
      {enableFunctionCalling && (
        <div className="space-y-2">
          {/* Expand/Collapse Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Select Tools ({selectedTools.length}/{availableTools.length})
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Tool List (expandable) */}
          {isExpanded && (
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading tools...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Error loading tools: {error}
                  </p>
                </div>
              )}

              {!loading && !error && availableTools.length > 0 && (
                <>
                  {/* Select All/None Button */}
                  <button
                    onClick={handleSelectAll}
                    className="w-full p-2 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    {selectedTools.length === availableTools.length ? 'Deselect All' : 'Select All'}
                  </button>

                  {/* Tool Categories */}
                  {toolCategories.map((category) => (
                    <div key={category.name} className="space-y-1">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        {category.name}
                      </h4>
                      {category.tools.map((tool) => (
                        <label
                          key={tool.name}
                          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTools.includes(tool.name)}
                            onChange={() => handleToolToggle(tool.name)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {tool.name}
                            </p>
                            {tool.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {tool.description}
                              </p>
                            )}
                          </div>
                          {selectedTools.includes(tool.name) && (
                            <Check className="h-4 w-4 text-indigo-600" />
                          )}
                        </label>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {!loading && !error && availableTools.length === 0 && (
                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tools available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
