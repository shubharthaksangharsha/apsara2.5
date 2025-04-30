from enum import Enum
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field


class ModelType(str, Enum):
    GEMINI_25_PRO = "gemini-2.5-pro-preview-03-25"
    GEMINI_20_FLASH = "gemini-2.0-flash"
    GEMINI_20_FLASH_LITE = "gemini-2.0-flash-lite"
    GEMINI_15_FLASH = "gemini-1.5-flash"
    GEMINI_15_FLASH_8B = "gemini-1.5-flash-8b"
    GEMINI_15_PRO = "gemini-1.5-pro"
    GEMINI_IMAGE_GEN = "gemini-2.0-flash-exp-image-generation"
    IMAGEN = "imagen-3.0-generate-002"


class ModelCapabilities(BaseModel):
    structured_outputs: bool = False
    caching: bool = False
    tuning: bool = False
    function_calling: bool = False
    code_execution: bool = False
    search: bool = False
    image_generation: bool = False
    native_tool_use: bool = False
    audio_generation: bool = False
    live_api: bool = False
    thinking: bool = False


class ModelInfo(BaseModel):
    model_id: ModelType
    display_name: str
    description: str
    input_token_limit: int
    output_token_limit: int
    supports_image: bool = False
    supports_audio: bool = False
    supports_video: bool = False
    supports_text: bool = True
    supports_image_output: bool = False
    supports_audio_output: bool = False
    capabilities: ModelCapabilities


AVAILABLE_MODELS: Dict[ModelType, ModelInfo] = {
    ModelType.GEMINI_25_PRO: ModelInfo(
        model_id=ModelType.GEMINI_25_PRO,
        display_name="Gemini 2.5 Pro",
        description="Our most powerful thinking model with maximum response accuracy and state-of-the-art performance",
        input_token_limit=1_048_576,
        output_token_limit=65_536,
        supports_image=True,
        supports_audio=True,
        supports_video=True,
        capabilities=ModelCapabilities(
            function_calling=True,
            code_execution=True,
            search=True,
            native_tool_use=True,
            thinking=True,
        ),
    ),
    ModelType.GEMINI_20_FLASH: ModelInfo(
        model_id=ModelType.GEMINI_20_FLASH,
        display_name="Gemini 2.0 Flash",
        description="Our newest multimodal model, with next generation features and improved capabilities",
        input_token_limit=1_048_576,
        output_token_limit=8_192,
        supports_image=True,
        supports_audio=True,
        supports_video=True,
        supports_image_output=True,
        supports_audio_output=False,  # Coming soon
        capabilities=ModelCapabilities(
            structured_outputs=True,
            function_calling=True,
            code_execution=True,
            search=True,
            image_generation=True,
            native_tool_use=True,
            live_api=True,
            thinking=True,
        ),
    ),
    ModelType.GEMINI_20_FLASH_LITE: ModelInfo(
        model_id=ModelType.GEMINI_20_FLASH_LITE,
        display_name="Gemini 2.0 Flash-Lite",
        description="A Gemini 2.0 Flash model optimized for cost efficiency and low latency",
        input_token_limit=1_048_576,
        output_token_limit=8_192,
        supports_image=True,
        supports_audio=True,
        supports_video=True,
        capabilities=ModelCapabilities(
            structured_outputs=True,
        ),
    ),
    ModelType.GEMINI_15_FLASH: ModelInfo(
        model_id=ModelType.GEMINI_15_FLASH,
        display_name="Gemini 1.5 Flash",
        description="Fast and versatile performance across a diverse variety of tasks",
        input_token_limit=1_048_576,
        output_token_limit=8_192,
        supports_image=True,
        supports_audio=True,
        supports_video=True,
        capabilities=ModelCapabilities(
            structured_outputs=True,
            caching=True,
            tuning=True,
            function_calling=True,
            code_execution=True,
        ),
    ),
    ModelType.GEMINI_15_FLASH_8B: ModelInfo(
        model_id=ModelType.GEMINI_15_FLASH_8B,
        display_name="Gemini 1.5 Flash-8B",
        description="High volume and lower intelligence tasks",
        input_token_limit=1_048_576,
        output_token_limit=8_192,
        supports_image=True,
        supports_audio=True,
        supports_video=True,
        capabilities=ModelCapabilities(
            structured_outputs=True,
            caching=True,
            tuning=True,
            function_calling=True,
            code_execution=True,
        ),
    ),
    ModelType.GEMINI_15_PRO: ModelInfo(
        model_id=ModelType.GEMINI_15_PRO,
        display_name="Gemini 1.5 Pro",
        description="Complex reasoning tasks requiring more intelligence",
        input_token_limit=2_097_152,
        output_token_limit=8_192,
        supports_image=True,
        supports_audio=True,
        supports_video=True,
        capabilities=ModelCapabilities(
            structured_outputs=True,
            caching=True,
            function_calling=True,
            code_execution=True,
        ),
    ),
    ModelType.GEMINI_IMAGE_GEN: ModelInfo(
        model_id=ModelType.GEMINI_IMAGE_GEN,
        display_name="Gemini Image Generation",
        description="Text-to-image and image editing capabilities",
        input_token_limit=1_048_576,
        output_token_limit=8_192,
        supports_image=True,
        supports_image_output=True,
        capabilities=ModelCapabilities(),
    ),
    ModelType.IMAGEN: ModelInfo(
        model_id=ModelType.IMAGEN,
        display_name="Imagen 3",
        description="Our most advanced image generation model",
        input_token_limit=4096,  # Approximate
        output_token_limit=0,    # Not applicable
        supports_image_output=True,
        capabilities=ModelCapabilities(),
    ),
}


class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None
    message_id: Optional[str] = None
    
    
class ChatMessage(BaseModel):
    role: str
    parts: Union[str, List[Dict[str, Any]]]


class ChatRequest(BaseModel):
    session_id: str
    message: str
    model: Optional[ModelType] = ModelType.GEMINI_20_FLASH
    system_instruction: Optional[str] = None
    tools_enabled: bool = False
    image_data: Optional[str] = None
    audio_data: Optional[str] = None
    video_data: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    response: str
    model: ModelType
    image_data: Optional[List[str]] = None
    audio_data: Optional[str] = None
    

class EditMessageRequest(BaseModel):
    session_id: str
    message_id: str
    new_content: str
    

class ImageGenerationRequest(BaseModel):
    prompt: str
    model: ModelType = ModelType.GEMINI_IMAGE_GEN
    number_of_images: Optional[int] = 1
    aspect_ratio: Optional[str] = "1:1"


class ModelSelectionRequest(BaseModel):
    query: str 