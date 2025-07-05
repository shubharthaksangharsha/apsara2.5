import React, { useEffect } from 'react';
import SidebarHeader from './components/SidebarHeader';
import NewChatButton from './components/NewChatButton';
import ConversationList from './components/ConversationList';
import SidebarFooter from './components/SidebarFooter';
import { SIDEBAR_Z_INDEX } from './constants';

/**
 * Main sidebar component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isSidebarOpen - Whether sidebar is open
 * @param {boolean} props.sidebarLocked - Whether sidebar is locked in expanded state
 * @param {Array} props.convos - List of conversations
 * @param {string} props.activeConvoId - ID of active conversation
 * @param {Function} props.onSetActiveConvoId - Handler to set active conversation
 * @param {Function} props.onSetIsSidebarOpen - Handler to set sidebar open state
 * @param {Function} props.onHandleSidebarHamburgerClick - Handler for hamburger button click
 * @param {Function} props.closeSidebar - Handler to close sidebar on mobile
 * @param {Function} props.onNewChat - Handler to start a new chat
 * @param {Function} props.onDeleteAllChats - Handler to delete all chats
 * @param {Function} props.onDeleteChat - Handler to delete a chat
 * @param {Function} props.onEditChatTitle - Handler to edit chat title
 * @param {Function} props.onPinChat - Handler to pin/unpin a chat
 * @returns {JSX.Element} Sidebar component
 */
export default function Sidebar({
  isSidebarOpen,
  sidebarLocked,
  convos,
  activeConvoId,
  onSetActiveConvoId,
  onSetIsSidebarOpen,
  onHandleSidebarHamburgerClick,
  closeSidebar,
  onNewChat,
  onDeleteAllChats,
  onDeleteChat,
  onEditChatTitle,
  onPinChat
}) {
  // Add/remove sidebar-locked class on body
  useEffect(() => {
    if (sidebarLocked) {
      document.body.classList.add('sidebar-locked');
    } else {
      document.body.classList.remove('sidebar-locked');
    }
    
    return () => {
      document.body.classList.remove('sidebar-locked');
    };
  }, [sidebarLocked]);

  return (
    <aside
      className={`
        fixed lg:relative inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg
        flex flex-col h-full z-${SIDEBAR_Z_INDEX}
        transition-all duration-500 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full'}  /* Mobile width */
        lg:translate-x-0                                    /* Ensure visible on large screens */
        ${sidebarLocked
            ? 'lg:w-64'                                    /* Locked: Fixed width */
            : 'lg:w-20 hover:lg:w-64 group'                /* Unlocked: Hover effect + group for inner items */
        }
      `}
    >
      {/* Main scrollable container for the entire sidebar content */}
      <div className="flex flex-col h-full overflow-x-hidden">
        {/* Sidebar Header */}
        <SidebarHeader
          sidebarLocked={sidebarLocked}
          onHandleSidebarHamburgerClick={onHandleSidebarHamburgerClick}
        />

        {/* New Chat Button */}
        <NewChatButton
          sidebarLocked={sidebarLocked}
          onNewChat={onNewChat}
        />

        {/* Conversations List */}
        <ConversationList
          convos={convos}
          activeConvoId={activeConvoId}
          onSetActiveConvoId={onSetActiveConvoId}
          onDeleteAllChats={onDeleteAllChats}
          onDeleteChat={onDeleteChat}
          onEditChatTitle={onEditChatTitle}
          onPinChat={onPinChat}
          closeSidebar={closeSidebar}
          sidebarLocked={sidebarLocked}
        />

        {/* Footer Credit */}
        <SidebarFooter sidebarLocked={sidebarLocked} />
      </div>
    </aside>
  );
}
