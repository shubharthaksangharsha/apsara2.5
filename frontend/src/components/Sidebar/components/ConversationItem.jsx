import React, { useState } from 'react';
import { MoreVertical, Edit2, Pin, PinOff, Trash2 } from 'lucide-react';

/**
 * Individual conversation item component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Conversation data
 * @param {boolean} props.isActive - Whether this is the active conversation
 * @param {Function} props.onSelect - Handler to select this conversation
 * @param {Function} props.onDelete - Handler to delete this conversation
 * @param {Function} props.onEdit - Handler to edit this conversation's title
 * @param {Function} props.onPin - Handler to pin/unpin this conversation
 * @returns {JSX.Element} Conversation item component
 */
const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onEdit,
  onPin
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title || 'Untitled');

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(conversation.title || 'Untitled');
    setMenuOpen(false);
  };

  const handleEditSave = () => {
    onEdit(conversation.id, editValue.trim() || 'Untitled');
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  return (
    <li
      className={`relative px-3 py-2 rounded-md cursor-pointer transition-all duration-150 ease-in-out flex justify-between items-center group/item ${
        isActive
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      {/* Clickable Area for Selection */}
      <div
        className="flex items-center flex-1 min-w-0 mr-2"
        onClick={onSelect}
      >
        <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 transition-colors ${isActive ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-600 group-hover/item:bg-indigo-400'}`}></div>
        {isEditing ? (
          <input
            className="text-sm bg-transparent border-b border-indigo-400 focus:outline-none focus:border-indigo-600 px-1 py-0.5 w-full"
            value={editValue}
            autoFocus
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={e => {
              if (e.key === 'Enter') handleEditSave();
              if (e.key === 'Escape') handleEditCancel();
            }}
          />
        ) : (
          <div className="truncate text-sm flex items-center gap-1">
            {conversation.title || 'Untitled'}
            {conversation.pinned && <Pin className="w-3 h-3 text-indigo-400 ml-1" />}
          </div>
        )}
      </div>
      {/* Hamburger menu for actions */}
      <div className="relative">
        <button
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-300 flex-shrink-0 focus:outline-none"
          title="Conversation options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 gap-2"
              onClick={handleEdit}
            >
              <Edit2 className="w-4 h-4" /> Edit Name
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 gap-2"
              onClick={() => { onPin(conversation.id); setMenuOpen(false); }}
            >
              {conversation.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />} {conversation.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 gap-2"
              onClick={() => { onDelete(conversation.id); setMenuOpen(false); }}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
};

export default ConversationItem;
