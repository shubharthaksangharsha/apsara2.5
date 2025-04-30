from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional
import base64
from io import BytesIO

from app.models.models import (
    ChatRequest, 
    ChatResponse, 
    EditMessageRequest,
    ModelType,
    AVAILABLE_MODELS
)
from app.utils.session_manager import SessionManager
from app.utils.gemini_client import GeminiClient
from app.utils.tools import get_enabled_tools, execute_tool, TOOL_DECLARATIONS

router = APIRouter(prefix="/chat", tags=["chat"])
session_manager = SessionManager()
gemini_client = GeminiClient()

@router.post("/sessions")
async def create_session(session_id: Optional[str] = None):
    """Create a new chat session."""
    try:
        session_id = session_manager.create_session(session_id)
        return {"session_id": session_id, "message": "Session created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_sessions():
    """Get all available chat sessions."""
    try:
        sessions = session_manager.get_all_sessions()
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get details of a specific session."""
    try:
        session = session_manager.get_session(session_id)
        return session
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session."""
    success = session_manager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return {"message": f"Session {session_id} deleted successfully"}

@router.post("/messages", response_model=ChatResponse)
async def send_message(chat_request: ChatRequest, background_tasks: BackgroundTasks):
    """Send a message to a chat session and get a response."""
    try:
        # Validate model
        if chat_request.model not in AVAILABLE_MODELS:
            raise HTTPException(status_code=400, detail=f"Model {chat_request.model} not available")
            
        # Get session or create a new one
        try:
            session = session_manager.get_session(chat_request.session_id)
        except ValueError:
            # Create a new session if it doesn't exist
            session_manager.create_session(chat_request.session_id)
            
        # Add user message to history
        message_id = session_manager.add_message(
            session_id=chat_request.session_id,
            role="user",
            content=chat_request.message,
            model=chat_request.model,
            system_instruction=chat_request.system_instruction,
            tools_enabled=chat_request.tools_enabled
        )
        
        # Get conversation history
        history = session_manager.get_conversation_history(
            chat_request.session_id,
            format_for_model=True
        )
        
        # Prepare tools if enabled
        tools_config = None
        if chat_request.tools_enabled:
            # For this example, we'll enable all tools
            # In a real app, you might want to let the user choose which tools to enable
            tools_config = get_enabled_tools(list(TOOL_DECLARATIONS.keys()))
        
        # Get or create chat session
        chat = gemini_client.create_chat(
            model=chat_request.model,
            system_instruction=chat_request.system_instruction,
            history=history,
            tools_config=tools_config
        )
        
        # Send message to model
        response = gemini_client.send_message(
            chat=chat,
            message=chat_request.message,
            image_data=chat_request.image_data
        )
        
        # Check if model wants to call a function
        function_call = None
        function_response = None
        final_response_text = None
        
        # Process function calls if present
        if hasattr(response, 'function_calls') and response.function_calls:
            # Handle function call
            function_call = response.function_calls[0]
            function_name = function_call.name
            function_args = function_call.args
            
            # Execute the function
            function_response = execute_tool(function_name, **function_args)
            
            # Send the function result back to the model
            function_response_message = f"Function {function_name} returned: {function_response}"
            follow_up_response = gemini_client.send_message(
                chat=chat,
                message=function_response_message
            )
            
            # Get the final response
            final_response_text = follow_up_response.text
        else:
            # Regular text response
            final_response_text = response.text
            
        # Process images if present in response
        image_data_list = None
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                parts = candidate.content.parts
                image_data_list = []
                
                for part in parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # Convert image to base64
                        image_bytes = part.inline_data.data
                        base64_image = base64.b64encode(image_bytes).decode('utf-8')
                        image_data_list.append(base64_image)
        
        # Save assistant's response to history
        session_manager.add_message(
            session_id=chat_request.session_id,
            role="assistant",
            content=final_response_text
        )
        
        # Return response
        return ChatResponse(
            session_id=chat_request.session_id,
            response=final_response_text,
            model=chat_request.model,
            image_data=image_data_list
        )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/messages/edit")
async def edit_message(edit_request: EditMessageRequest):
    """Edit a message and regenerate responses after it."""
    try:
        # Update the message in the session
        updated_session = session_manager.edit_message(
            session_id=edit_request.session_id,
            message_id=edit_request.message_id,
            new_content=edit_request.new_content
        )
        
        return {"message": "Message edited successfully", "session": updated_session}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/{session_id}")
async def get_messages(session_id: str):
    """Get all messages for a specific session."""
    try:
        messages = session_manager.get_messages(session_id)
        return {"messages": messages}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 