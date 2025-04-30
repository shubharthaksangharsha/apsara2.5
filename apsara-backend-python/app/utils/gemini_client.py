import os
import base64
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from io import BytesIO
import uuid

from PIL import Image
from google import genai
from google.genai import types

from app.models.models import ModelType, AVAILABLE_MODELS


class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        self.client = genai.Client(api_key=api_key)
        
    def generate_text(
        self,
        model: ModelType,
        prompt: str,
        system_instruction: Optional[str] = None,
        image_data: Optional[str] = None,
        audio_data: Optional[str] = None,
        video_data: Optional[str] = None,
        stream: bool = False,
        tools_config: Optional[List[Dict[str, Any]]] = None,
    ):
        """Generate text response from Gemini models."""
        model_info = AVAILABLE_MODELS.get(model)
        if not model_info:
            raise ValueError(f"Model {model} not found")
        
        contents = []
        
        # Add system instruction if provided
        if system_instruction:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        else:
            config = types.GenerateContentConfig()
            
        # Add tools if enabled
        if tools_config:
            tools = []
            for tool_config in tools_config:
                if "function_declarations" in tool_config:
                    tools.append(types.Tool(function_declarations=tool_config["function_declarations"]))
            
            if tools:
                config.tools = tools
        
        # Prepare multimodal input if any
        parts = []
        
        if image_data:
            # Assuming image_data is base64 encoded
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            parts.append(types.Part.from_image(image))
        
        if audio_data or video_data:
            # For audio and video, we'd need to handle file uploads 
            # which would require additional implementation
            pass
        
        # Add text prompt
        parts.append(types.Part.from_text(prompt))
        
        contents.append(types.Content(parts=parts))
        
        # Generate response
        if stream:
            response = self.client.models.generate_content_stream(
                model=model,
                contents=contents,
                config=config
            )
            return response
        else:
            response = self.client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            return response
    
    def create_chat(
        self,
        model: ModelType,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        tools_config: Optional[List[Dict[str, Any]]] = None,
    ):
        """Create a chat session with Gemini."""
        config = types.GenerateContentConfig()
        
        if system_instruction:
            config.system_instruction = system_instruction
            
        if tools_config:
            tools = []
            for tool_config in tools_config:
                if "function_declarations" in tool_config:
                    tools.append(types.Tool(function_declarations=tool_config["function_declarations"]))
            
            if tools:
                config.tools = tools
        
        formatted_history = []
        if history:
            for message in history:
                role = message.get("role")
                content = message.get("content")
                
                # Format the history in the way Gemini expects
                if role and content:
                    formatted_history.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(content)]
                        )
                    )
        
        chat = self.client.chats.create(
            model=model,
            history=formatted_history if formatted_history else None,
            config=config
        )
        
        return chat
    
    def send_message(
        self,
        chat,
        message: str,
        image_data: Optional[str] = None,
        stream: bool = False,
    ):
        """Send a message in an existing chat session."""
        parts = []
        
        if image_data:
            # Assuming image_data is base64 encoded
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            parts.append(types.Part.from_image(image))
        
        parts.append(types.Part.from_text(message))
        
        if stream:
            response = chat.send_message_stream(parts)
        else:
            response = chat.send_message(parts)
            
        return response
    
    def generate_image(
        self,
        prompt: str,
        model: ModelType = ModelType.GEMINI_IMAGE_GEN,
        number_of_images: int = 1,
        aspect_ratio: str = "1:1",
    ):
        """Generate images using Gemini or Imagen models."""
        if model == ModelType.IMAGEN:
            # For Imagen 3
            response = self.client.models.generate_images(
                model=model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=number_of_images,
                    aspect_ratio=aspect_ratio,
                )
            )
            return response
        elif model == ModelType.GEMINI_IMAGE_GEN:
            # For Gemini 2.0 Flash with image generation
            response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=['Text', 'Image']
                )
            )
            return response
        else:
            raise ValueError(f"Model {model} does not support image generation")
    
    def get_model_info(self, model: ModelType):
        """Get information about a specific model."""
        return AVAILABLE_MODELS.get(model)
    
    def get_available_models(self):
        """Get all available models."""
        return AVAILABLE_MODELS
    
    def select_best_model(self, query: str):
        """Select the best model based on query complexity."""
        # This is a simplified implementation. In a real-world scenario,
        # this would involve more sophisticated analysis of the query.
        
        # If the query contains image generation keywords
        if any(keyword in query.lower() for keyword in ["generate image", "create image", "make picture"]):
            return ModelType.GEMINI_IMAGE_GEN
            
        # If the query seems complex (contains multiple questions, complex reasoning)
        if len(query.split()) > 50 or "?" in query and query.count("?") > 2:
            return ModelType.GEMINI_25_PRO
            
        # Default to a balanced model
        return ModelType.GEMINI_20_FLASH 