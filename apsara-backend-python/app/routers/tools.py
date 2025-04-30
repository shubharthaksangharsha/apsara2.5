from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

from app.utils.tools import TOOL_DECLARATIONS, execute_tool

router = APIRouter(prefix="/tools", tags=["tools"])

class ToolExecutionRequest(BaseModel):
    tool_name: str
    args: Dict[str, Any]

@router.get("/")
async def get_available_tools():
    """Get all available tools."""
    tools = []
    
    for name, tool_declaration in TOOL_DECLARATIONS.items():
        tools.append({
            "name": name,
            "display_name": tool_declaration["name"],
            "description": tool_declaration["description"],
            "parameters": tool_declaration["parameters"]
        })
    
    return {"tools": tools}

@router.get("/{tool_name}")
async def get_tool_info(tool_name: str):
    """Get information about a specific tool."""
    if tool_name not in TOOL_DECLARATIONS:
        raise HTTPException(status_code=404, detail=f"Tool {tool_name} not found")
    
    tool_declaration = TOOL_DECLARATIONS[tool_name]
    
    return {
        "name": tool_name,
        "display_name": tool_declaration["name"],
        "description": tool_declaration["description"],
        "parameters": tool_declaration["parameters"]
    }

@router.post("/execute")
async def execute_tool_endpoint(request: ToolExecutionRequest):
    """Execute a tool with the provided arguments."""
    try:
        result = execute_tool(request.tool_name, **request.args)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {"tool": request.tool_name, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 