import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
import shutil

from app.models.models import ModelType


class SessionManager:
    def __init__(self, history_dir: str = "data/history"):
        self.history_dir = history_dir
        self.active_sessions: Dict[str, Any] = {}
        
        # Ensure history directory exists
        os.makedirs(self.history_dir, exist_ok=True)
    
    def create_session(self, session_id: Optional[str] = None) -> str:
        """Create a new chat session."""
        if not session_id:
            session_id = str(uuid.uuid4())
            
        session_path = os.path.join(self.history_dir, f"{session_id}")
        os.makedirs(session_path, exist_ok=True)
        
        # Initialize an empty history file
        history_file = os.path.join(session_path, "history.json")
        if not os.path.exists(history_file):
            with open(history_file, 'w') as f:
                json.dump({
                    "session_id": session_id,
                    "created_at": datetime.now().isoformat(),
                    "model": None,
                    "system_instruction": None,
                    "tools_enabled": False,
                    "messages": []
                }, f, indent=2)
        
        return session_id
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Get session details."""
        session_path = os.path.join(self.history_dir, session_id)
        history_file = os.path.join(session_path, "history.json")
        
        if not os.path.exists(history_file):
            raise ValueError(f"Session {session_id} not found")
        
        with open(history_file, 'r') as f:
            session_data = json.load(f)
            
        return session_data
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        model: Optional[ModelType] = None,
        system_instruction: Optional[str] = None,
        tools_enabled: bool = False,
    ) -> str:
        """Add a message to the session history."""
        session_data = self.get_session(session_id)
        
        message_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Update session metadata if provided
        if model:
            session_data["model"] = model
        if system_instruction:
            session_data["system_instruction"] = system_instruction
        if tools_enabled:
            session_data["tools_enabled"] = tools_enabled
        
        # Add message to history
        message = {
            "message_id": message_id,
            "role": role,
            "content": content,
            "timestamp": timestamp
        }
        session_data["messages"].append(message)
        
        # Save updated history
        session_path = os.path.join(self.history_dir, session_id)
        history_file = os.path.join(session_path, "history.json")
        
        with open(history_file, 'w') as f:
            json.dump(session_data, f, indent=2)
        
        return message_id
    
    def edit_message(self, session_id: str, message_id: str, new_content: str) -> Dict[str, Any]:
        """Edit a message and truncate history after it."""
        session_data = self.get_session(session_id)
        
        # Find the message index
        message_index = -1
        for i, message in enumerate(session_data["messages"]):
            if message["message_id"] == message_id:
                message_index = i
                break
                
        if message_index == -1:
            raise ValueError(f"Message {message_id} not found in session {session_id}")
        
        # Update the message content
        session_data["messages"][message_index]["content"] = new_content
        session_data["messages"][message_index]["timestamp"] = datetime.now().isoformat()
        
        # Truncate any messages after this one
        session_data["messages"] = session_data["messages"][:message_index + 1]
        
        # Save updated history
        session_path = os.path.join(self.history_dir, session_id)
        history_file = os.path.join(session_path, "history.json")
        
        with open(history_file, 'w') as f:
            json.dump(session_data, f, indent=2)
        
        return session_data
    
    def get_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all messages in a session."""
        session_data = self.get_session(session_id)
        return session_data["messages"]
    
    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Get a list of all available sessions."""
        sessions = []
        
        if not os.path.exists(self.history_dir):
            return sessions
            
        for item in os.listdir(self.history_dir):
            session_path = os.path.join(self.history_dir, item)
            if os.path.isdir(session_path):
                history_file = os.path.join(session_path, "history.json")
                if os.path.exists(history_file):
                    with open(history_file, 'r') as f:
                        session_data = json.load(f)
                        # Get basic session info
                        sessions.append({
                            "session_id": session_data.get("session_id"),
                            "created_at": session_data.get("created_at"),
                            "model": session_data.get("model"),
                            "message_count": len(session_data.get("messages", [])),
                        })
        
        # Sort by creation date, newest first
        sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return sessions
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its history."""
        session_path = os.path.join(self.history_dir, session_id)
        
        if not os.path.exists(session_path):
            return False
            
        try:
            shutil.rmtree(session_path)
            return True
        except Exception:
            return False
    
    def get_conversation_history(
        self,
        session_id: str,
        format_for_model: bool = False
    ) -> List[Dict[str, Any]]:
        """Get conversation history in the format needed for the model or for display."""
        session_data = self.get_session(session_id)
        messages = session_data.get("messages", [])
        
        if format_for_model:
            # Convert to the format expected by the Gemini API
            formatted_history = []
            for message in messages:
                role = message["role"]
                # Gemini API expects "user" or "model" roles
                if role == "assistant":
                    role = "model"
                
                formatted_history.append({
                    "role": role,
                    "content": message["content"]
                })
            return formatted_history
        
        return messages 