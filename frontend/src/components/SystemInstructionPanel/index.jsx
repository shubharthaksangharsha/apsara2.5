import React, { useState, useEffect } from 'react';
import { Pencil, ChevronDown, ChevronUp, Check } from 'lucide-react';

// Predefined system instruction templates
const INSTRUCTION_TEMPLATES = [
  {
    id: 'default',
    name: 'Default Assistant',
    value: 'You are a helpful, creative, and intelligent assistant. You provide accurate information and assist users with various tasks.'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    value: 'You are a data analyst assistant. Help users analyze data, create visualizations, interpret statistics, and explain data science concepts. Provide code examples in Python, R, or SQL when relevant.'
  },
  {
    id: 'medical',
    name: 'Medical Assistant',
    value: 'You are a medical information assistant. Provide general health information and medical explanations. Always remind users to consult healthcare professionals for personal medical advice.'
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    value: 'You are a creative writing assistant. Help users draft stories, poems, scripts, and other creative content. Offer stylistic suggestions, plot ideas, and character development advice.'
  },
  {
    id: 'programmer',
    name: 'Programmer',
    value: 'You are a programming assistant. Provide clean, efficient code examples, debug issues, and explain programming concepts. Focus on practical solutions with clear documentation.'
  },
  {
    id: 'teacher',
    name: 'Teacher',
    value: 'You are a teaching assistant. Explain complex concepts simply, create lesson materials, and provide educational resources. Adapt explanations to different learning levels.'
  }
];

/**
 * Compact System Instruction Panel with expandable template options
 * 
 * @param {Object} props - Component props
 * @param {string} props.value - Current instruction value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.isApplicable - Whether system instructions are applicable for current model
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @returns {JSX.Element} System instruction panel component
 */
const SystemInstructionPanel = ({ value, onChange, isApplicable, darkMode = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  
  // Update edit value when prop changes
  useEffect(() => {
    setEditValue(value);
    
    // Check if current value matches any template
    const matchingTemplate = INSTRUCTION_TEMPLATES.find(template => template.value === value);
    setSelectedTemplateId(matchingTemplate?.id || null);
  }, [value]);
  
  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    const template = INSTRUCTION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setEditValue(template.value);
      setSelectedTemplateId(templateId);
    }
  };
  
  // Handle save changes
  const handleSave = () => {
    onChange(editValue);
    setIsExpanded(false);
  };
  
  // Handle cancel changes
  const handleCancel = () => {
    setEditValue(value);
    setIsExpanded(false);
  };
  
  // Render compact view (when not expanded)
  if (!isExpanded) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl p-3 shadow-md`}>
        <div className="flex justify-between items-center">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>System Instruction</h3>
          <button
            onClick={() => setIsExpanded(true)}
            className={`p-1 rounded-md ${
              darkMode 
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' 
                : 'text-gray-500 hover:bg-gray-300 hover:text-gray-700'
            } transition-colors`}
            disabled={!isApplicable}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className={`mt-2 p-2 ${
          darkMode 
            ? 'bg-gray-700 text-gray-300' 
            : 'bg-gray-100 text-gray-700'
        } rounded-md text-sm max-h-16 overflow-hidden`}>
          {value ? (
            <div className="line-clamp-2">{value}</div>
          ) : (
            <div className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} italic`}>No system instruction set</div>
          )}
        </div>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
          Sets context for the AI (not used in Live mode or for image generation).
        </p>
      </div>
    );
  }
  
  // Render expanded view with template selection
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[80]">
      <div className={`w-full max-w-2xl ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-xl p-4 max-h-[90vh] overflow-hidden flex flex-col`}>
        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-3`}>System Instruction</h2>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Templates List (Left Side) */}
          <div className="space-y-3 md:col-span-1 overflow-y-auto">
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Templates</h3>
            <div className="space-y-2 pr-2">
              {INSTRUCTION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                    selectedTemplateId === template.id
                      ? 'bg-indigo-600 text-white'
                      : darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Editor (Right Side) */}
          <div className="md:col-span-2">
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Edit Instruction</h3>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-800'
              } text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              rows={10}
              placeholder="Enter custom system instruction..."
              disabled={!isApplicable}
            />
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1 mb-4`}>
              The system instruction helps define the AI's behavior, knowledge, and tone.
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={`flex justify-end gap-3 mt-4 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={handleCancel}
            className={`px-4 py-2 rounded-md ${
              darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1"
            disabled={!isApplicable}
          >
            <Check className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemInstructionPanel; 