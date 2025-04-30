import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import chat, models, tools, images

# Load environment variables
load_dotenv()

# Check if the API key is set
if not os.getenv("GEMINI_API_KEY"):
    print("WARNING: GEMINI_API_KEY environment variable is not set.")
    print("Please set it in your environment or create a .env file.")

# Create the FastAPI application
app = FastAPI(
    title="Apsara 2.5 API",
    description="Backend API for Apsara 2.5, a Gemini-powered chat application",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(models.router)
app.include_router(tools.router)
app.include_router(images.router)

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Apsara 2.5 API",
        "version": "1.0.0",
        "description": "Backend API for Apsara 2.5, a Gemini-powered chat application",
        "endpoints": {
            "chat": "/chat",
            "models": "/models",
            "tools": "/tools",
            "images": "/images",
        }
    } 