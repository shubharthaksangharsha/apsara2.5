import React from 'react';
import { MessageSquare, Code2, MapPin, Calendar, Sun } from 'lucide-react';
import { TABS } from '../constants';

/**
 * TabBar component for navigation between different tabs
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - ID of the currently active tab
 * @param {Function} props.setActiveTab - Function to change the active tab
 * @param {string} props.connectionStatus - Current connection status
 * @returns {JSX.Element} TabBar component
 */
const TabBar = ({ activeTab, setActiveTab, connectionStatus }) => {
  // Map icon strings to actual components
  const getIcon = (iconName) => {
    switch(iconName) {
      case 'MessageSquare': return MessageSquare;
      case 'Code2': return Code2;
      case 'MapPin': return MapPin;
      case 'CalendarIcon': return Calendar;
      case 'Sun': return Sun;
      default: return MessageSquare;
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-300 dark:border-gray-600 mb-1.5 sm:mb-2 overflow-x-auto custom-scrollbar">
      <nav className="flex space-x-1 -mb-px whitespace-nowrap">
        {TABS.map(tab => {
          const IconComponent = getIcon(tab.icon);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.isPlaceholder && connectionStatus !== 'connected'}
              className={`whitespace-nowrap flex items-center gap-1 py-1 px-1.5 sm:py-2 sm:px-3 border-b-2 font-medium text-[9px] sm:text-xs
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}
                ${(tab.isPlaceholder && connectionStatus !== 'connected') ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <IconComponent className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default TabBar; 