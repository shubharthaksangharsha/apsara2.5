from fastapi import APIRouter, HTTPException
from typing import Dict, List

from app.models.models import ModelType, AVAILABLE_MODELS, ModelSelectionRequest
from app.utils.gemini_client import GeminiClient

router = APIRouter(prefix="/models", tags=["models"])
gemini_client = GeminiClient()

@router.get("/")
async def get_available_models():
    """Get all available Gemini models."""
    models_info = []
    
    for model_id, model_info in AVAILABLE_MODELS.items():
        models_info.append({
            "id": model_id,
            "display_name": model_info.display_name,
            "description": model_info.description,
            "input_token_limit": model_info.input_token_limit,
            "output_token_limit": model_info.output_token_limit,
            "supports_image": model_info.supports_image,
            "supports_audio": model_info.supports_audio,
            "supports_video": model_info.supports_video,
            "supports_text": model_info.supports_text,
            "supports_image_output": model_info.supports_image_output,
            "supports_audio_output": model_info.supports_audio_output,
            "capabilities": {
                "structured_outputs": model_info.capabilities.structured_outputs,
                "caching": model_info.capabilities.caching,
                "tuning": model_info.capabilities.tuning,
                "function_calling": model_info.capabilities.function_calling,
                "code_execution": model_info.capabilities.code_execution,
                "search": model_info.capabilities.search,
                "image_generation": model_info.capabilities.image_generation,
                "native_tool_use": model_info.capabilities.native_tool_use,
                "audio_generation": model_info.capabilities.audio_generation,
                "live_api": model_info.capabilities.live_api,
                "thinking": model_info.capabilities.thinking,
            }
        })
    
    return {"models": models_info}

@router.get("/{model_id}")
async def get_model_info(model_id: ModelType):
    """Get information about a specific model."""
    try:
        model_info = AVAILABLE_MODELS.get(model_id)
        if not model_info:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
            
        return {
            "id": model_id,
            "display_name": model_info.display_name,
            "description": model_info.description,
            "input_token_limit": model_info.input_token_limit,
            "output_token_limit": model_info.output_token_limit,
            "supports_image": model_info.supports_image,
            "supports_audio": model_info.supports_audio,
            "supports_video": model_info.supports_video,
            "supports_text": model_info.supports_text,
            "supports_image_output": model_info.supports_image_output,
            "supports_audio_output": model_info.supports_audio_output,
            "capabilities": {
                "structured_outputs": model_info.capabilities.structured_outputs,
                "caching": model_info.capabilities.caching,
                "tuning": model_info.capabilities.tuning,
                "function_calling": model_info.capabilities.function_calling,
                "code_execution": model_info.capabilities.code_execution,
                "search": model_info.capabilities.search,
                "image_generation": model_info.capabilities.image_generation,
                "native_tool_use": model_info.capabilities.native_tool_use,
                "audio_generation": model_info.capabilities.audio_generation,
                "live_api": model_info.capabilities.live_api,
                "thinking": model_info.capabilities.thinking,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/select")
async def select_best_model(request: ModelSelectionRequest):
    """Select the best model based on the query."""
    try:
        best_model = gemini_client.select_best_model(request.query)
        model_info = AVAILABLE_MODELS.get(best_model)
        
        if not model_info:
            raise HTTPException(status_code=500, detail="Failed to select a model")
            
        return {
            "selected_model": best_model,
            "display_name": model_info.display_name,
            "description": model_info.description
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 