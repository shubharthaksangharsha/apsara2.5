# Sidebar Component

The Sidebar component provides navigation and conversation management for the Apsara 2.5 application. It includes features for conversation selection, creation, editing, pinning, and deletion.

## Usage

```jsx
import Sidebar from '../components/Sidebar';

// Inside your component
<Sidebar
  isSidebarOpen={isSidebarOpen}
  sidebarLocked={sidebarLocked}
  convos={convos}
  activeConvoId={activeConvoId}
  onSetActiveConvoId={setActiveConvoId}
  onSetIsSidebarOpen={setIsSidebarOpen}
  onHandleSidebarHamburgerClick={handleSidebarHamburgerClick}
  closeSidebar={closeSidebar}
  onNewChat={createNewChat}
  onDeleteAllChats={handleDeleteAllChats}
  onDeleteChat={handleDeleteChat}
  onEditChatTitle={handleEditChatTitle}
  onPinChat={handlePinChat}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `isSidebarOpen` | Boolean | Whether sidebar is visible on mobile |
| `sidebarLocked` | Boolean | Whether sidebar is locked in expanded state on desktop |
| `convos` | Array | List of conversation objects |
| `activeConvoId` | String | ID of the currently active conversation |
| `onSetActiveConvoId` | Function | Handler to set active conversation |
| `onSetIsSidebarOpen` | Function | Handler to update sidebar open state |
| `onHandleSidebarHamburgerClick` | Function | Handler for hamburger button click |
| `closeSidebar` | Function | Handler to close sidebar on mobile |
| `onNewChat` | Function | Handler to create new conversation |
| `onDeleteAllChats` | Function | Handler to delete all conversations |
| `onDeleteChat` | Function | Handler to delete a specific conversation |
| `onEditChatTitle` | Function | Handler to edit conversation title |
| `onPinChat` | Function | Handler to pin/unpin a conversation |

## Structure

- `index.jsx` - Main component implementation
- `constants.js` - Component-specific constants
- `components/` - Subcomponents
  - `SidebarHeader.jsx` - Header section with app title and hamburger button
  - `NewChatButton.jsx` - Button to create new conversations
  - `ConversationList.jsx` - List container for conversations
  - `ConversationItem.jsx` - Individual conversation list item
  - `SidebarFooter.jsx` - Footer section with developer credits

## Features

- Responsive design for mobile and desktop
- Collapsible sidebar on desktop for more space
- Lockable in expanded state for better readability
- Conversation management (create, edit, pin, delete)
- Animated hover effects and transitions
- Support for both light and dark themes