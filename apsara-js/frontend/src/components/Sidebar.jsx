import React, { useState, useEffect } from 'react';
import { Menu, MoreVertical, UserIcon, Edit2, Pin, PinOff, Trash2 } from 'lucide-react';

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
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const handleEdit = (id, title) => {
    setEditingId(id);
    setEditValue(title);
    setMenuOpenId(null);
  };
  const handleEditSave = (id) => {
    onEditChatTitle(id, editValue.trim() || 'Untitled');
    setEditingId(null);
  };
  const handleEditCancel = () => {
    setEditingId(null);
  };

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
        flex flex-col h-full z-50
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
      <div className="flex flex-col h-full overflow-x-hidden"> {/* Removed overflow-y-auto here, will put it on the list */}

        {/* Sidebar Hamburger/Lock Button */}
        <div className="hidden lg:flex flex-shrink-0 px-3 pt-3 pb-2">
          <button
            onClick={onHandleSidebarHamburgerClick} // Handler from App.jsx
            className={`p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out ${sidebarLocked ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''}`} // Style based on lock
            aria-label={sidebarLocked ? "Unlock Sidebar" : "Lock Sidebar"}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Animated App Title */}
        {/* Apply visibility logic based on sidebarLocked OR group hover when unlocked */}
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 overflow-hidden">
          <span
            className={`
              text-lg font-semibold whitespace-nowrap animate-shimmer transition-opacity duration-300
              ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 group-hover:lg:opacity-100'}
            `}
            style={{ animationDuration: '3s' }}
          >
            Apsara 2.5
          </span>
        </div>

        {/* New Chat Button Container */}
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
            {/* Text visibility based on lock OR hover */}
            <span className={`
              transition-opacity duration-300 whitespace-nowrap
              ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 group-hover:lg:opacity-100 group-hover:lg:w-auto'}
            `}>
              New Chat
            </span>
          </button>
        </div>

        {/* Conversations List Container */}
        <div className={`
          flex-1 px-2 overflow-hidden transition-opacity duration-300
          flex flex-col /* Make this a flex column to manage children height */
          ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 group-hover:lg:opacity-100'}
        `}>
          <div className="my-0 flex justify-between items-center px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10 flex-shrink-0"> {/* flex-shrink-0 for header */}
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
          {/* This ul will now be the scrollable part for conversations */}
          <ul className="space-y-1 pb-2 overflow-y-auto custom-scrollbar flex-grow"> {/* Added overflow-y-auto, custom-scrollbar, and flex-grow */}
            {convos && convos.map(c => (
              <li
                key={c.id}
                className={`relative px-3 py-2 rounded-md cursor-pointer transition-all duration-150 ease-in-out flex justify-between items-center group/item ${
                  c.id === activeConvoId
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {/* Clickable Area for Selection */}
                <div
                  className="flex items-center flex-1 min-w-0 mr-2"
                  onClick={() => {
                    onSetActiveConvoId(c.id);
                    if (window.innerWidth < 1024) closeSidebar();
                  }}
                >
                  <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 transition-colors ${c.id === activeConvoId ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-600 group-hover/item:bg-indigo-400'}`}></div>
                  {editingId === c.id ? (
                    <input
                      className="text-sm bg-transparent border-b border-indigo-400 focus:outline-none focus:border-indigo-600 px-1 py-0.5 w-full"
                      value={editValue}
                      autoFocus
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleEditSave(c.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditSave(c.id);
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                    />
                  ) : (
                    <div className="truncate text-sm flex items-center gap-1">
                      {c.title || 'Untitled'}
                      {c.pinned && <Pin className="w-3 h-3 text-indigo-400 ml-1" />}
                    </div>
                  )}
                </div>
                {/* Hamburger menu for actions */}
                <div className="relative">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === c.id ? null : c.id);
                    }}
                    className="p-1 text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-300 flex-shrink-0 focus:outline-none"
                    title="Conversation options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpenId === c.id && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
                      <button
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 gap-2"
                        onClick={() => handleEdit(c.id, c.title)}
                      >
                        <Edit2 className="w-4 h-4" /> Edit Name
                      </button>
                      <button
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 gap-2"
                        onClick={() => { onPinChat(c.id); setMenuOpenId(null); }}
                      >
                        {c.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />} {c.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 gap-2"
                        onClick={() => { onDeleteChat(c.id); setMenuOpenId(null); }}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Credit */}
        {/* Visibility based on lock OR hover */}
        <div className="flex-shrink-0 mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
          <a
            href="https://shubharthaksangharsha.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group/footer text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300"
          >
            {/* Shimmering Background Div */}
            <div
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-1 ring-inset ring-gray-300 dark:ring-gray-600 flex-shrink-0 transition-colors group-hover/footer:ring-indigo-500 animate-shimmer relative overflow-hidden"
              style={{
                animationDuration: '3s',
                '--shimmer-color': 'rgba(255,255,255,0.1)',
                '--shimmer-color-dark': 'rgba(0,0,0,0.1)'
              }}
            >
              {/* UserIcon - Apply drop shadow for glow effect */}
              <UserIcon
                className="
                  h-4 w-4 text-indigo-500 dark:text-indigo-400            /* Keep base color */
                  transition-all duration-300 ease-in-out                /* Smooth transitions */
                  drop-shadow-[0_1px_2px_rgba(129,140,248,0.7)]          /* Base indigo glow (light) */
                  dark:drop-shadow-[0_1px_2px_rgba(165,180,252,0.6)]       /* Base indigo glow (dark) */
                  group-hover/footer:scale-110                           /* Scale on hover */
                  group-hover/footer:drop-shadow-[0_2px_5px_rgba(129,140,248,0.9)]  /* Enhanced indigo glow on hover (light) */
                  dark:group-hover/footer:drop-shadow-[0_2px_5px_rgba(165,180,252,0.8)] /* Enhanced indigo glow on hover (dark) */
                "
              />
            </div>
            <div className={`
              flex flex-col transition-opacity duration-300
              ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 group-hover:lg:opacity-100'}
            `}>
              <span className="text-xs whitespace-nowrap">Developed by</span>
              <span className="text-sm font-medium whitespace-nowrap">Shubharthak</span>
            </div>
          </a>
        </div>
      </div>
    </aside>
  );
}
