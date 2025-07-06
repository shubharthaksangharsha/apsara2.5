import React from 'react';
import { Trash2 } from 'lucide-react';
import ConversationItem from './ConversationItem';
import { DESKTOP_BREAKPOINT } from '../constants';

/**
 * Conversation list component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.convos - List of conversations
 * @param {string} props.activeConvoId - ID of active conversation
 * @param {Function} props.onSetActiveConvoId - Handler to set active conversation
 * @param {Function} props.onDeleteAllChats - Handler to delete all chats
 * @param {Function} props.onDeleteChat - Handler to delete a chat
 * @param {Function} props.onEditChatTitle - Handler to edit chat title
 * @param {Function} props.onPinChat - Handler to pin/unpin a chat
 * @param {Function} props.closeSidebar - Handler to close sidebar on mobile
 * @param {boolean} props.sidebarLocked - Whether sidebar is locked in expanded state
 * @returns {JSX.Element} Conversation list component
 */
const ConversationList = ({
  convos,
  activeConvoId,
  onSetActiveConvoId,
  onDeleteAllChats,
  onDeleteChat,
  onEditChatTitle,
  onPinChat,
  closeSidebar,
  sidebarLocked
}) => {
  return (
    <div className={`
      flex-1 px-2 overflow-hidden transition-opacity duration-300
      flex flex-col
      ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 group-hover:lg:opacity-100'}
    `}>
      <div className="my-0 flex justify-between items-center px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10 flex-shrink-0">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Conversations
        </div>
        {convos && convos.length > 0 && (
          <button
            onClick={onDeleteAllChats}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            title="Delete all conversations"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete All</span>
          </button>
        )}
      </div>
      <ul className="space-y-1 pb-2 overflow-y-auto custom-scrollbar flex-grow">
        {convos && convos.map(convo => (
          <ConversationItem
            key={convo.id}
            conversation={convo}
            isActive={convo.id === activeConvoId}
            onSelect={() => {
              onSetActiveConvoId(convo.id);
              if (window.innerWidth < DESKTOP_BREAKPOINT) closeSidebar();
            }}
            onDelete={onDeleteChat}
            onEdit={onEditChatTitle}
            onPin={onPinChat}
          />
        ))}
      </ul>
    </div>
  );
};

export default ConversationList;
