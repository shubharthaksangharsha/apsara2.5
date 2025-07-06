import React from 'react';

/**
 * New chat button component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.sidebarLocked - Whether sidebar is locked in expanded state
 * @param {Function} props.onNewChat - Handler for new chat button click
 * @returns {JSX.Element} New chat button component
 */
const NewChatButton = ({ sidebarLocked, onNewChat }) => {
  return (
    <div className="flex-shrink-0 px-4 py-2">
      <button
        className={`
          flex items-center w-full gap-2 px-3 py-2 bg-indigo-500 text-white rounded-lg
          hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
          transition-all duration-300 ease-in-out shadow hover:shadow-md
          ${sidebarLocked ? 'lg:justify-start' : 'lg:justify-center group-hover:lg:justify-start'}
        `}
        onClick={onNewChat}
      >
        <span className="text-lg flex-shrink-0">+</span>
        <span className={`
          transition-opacity duration-300 whitespace-nowrap
          ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 group-hover:lg:opacity-100 group-hover:lg:w-auto'}
        `}>
          New Chat
        </span>
      </button>
    </div>
  );
};

export default NewChatButton; 