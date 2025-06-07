import React from 'react';
import { MessageSquare, Code2, MapPin, CalendarIcon, Sun } from 'lucide-react';
import { TABS } from '../constants';

// Map of tab icons
const tabIcons = {
  'MessageSquare': MessageSquare,
  'Code2': Code2,
  'MapPin': MapPin,
  'CalendarIcon': CalendarIcon,
  'Sun': Sun,
};

/**
 * Tab bar component for switching between different views
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Handler for tab changes
 * @returns {JSX.Element} TabBar component
 */
const TabBar = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const IconComponent = tabIcons[tab.icon];
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar; 