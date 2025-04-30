from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any, Optional
import base64
from io import BytesIO

from app.models.models import ImageGenerationRequest, ModelType
from app.utils.gemini_client import GeminiClient

router = APIRouter(prefix="/images", tags=["images"])
gemini_client = GeminiClient()

@router.post("/generate")
async def generate_image(request: ImageGenerationRequest):
    """Generate an image using Gemini or Imagen models."""
    try:
        if request.model not in [ModelType.GEMINI_IMAGE_GEN, ModelType.IMAGEN]:
            raise HTTPException(
                status_code=400, 
                detail=f"Model {request.model} does not support image generation"
            )
        
        # Call the appropriate model to generate images
        response = gemini_client.generate_image(
            prompt=request.prompt,
            model=request.model,
            number_of_images=request.number_of_images,
            aspect_ratio=request.aspect_ratio
        )
        
        generated_images = []
        
        if request.model == ModelType.IMAGEN:
            # Handle Imagen response
            for img in response.generated_images:
                # Convert to base64
                base64_image = base64.b64encode(img.image.image_bytes).decode('utf-8')
                generated_images.append(base64_image)
                
        elif request.model == ModelType.GEMINI_IMAGE_GEN:
            # Handle Gemini response
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content:
                    parts = candidate.content.parts
                    
                    # Extract text and images
                    text_parts = []
                    for part in parts:
                        if hasattr(part, 'text') and part.text:
                            text_parts.append(part.text)
                        elif hasattr(part, 'inline_data') and part.inline_data:
                            # Convert image to base64
                            image_bytes = part.inline_data.data
                            base64_image = base64.b64encode(image_bytes).decode('utf-8')
                            generated_images.append(base64_image)
        
        return {
            "images": generated_images,
            "model": request.model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 