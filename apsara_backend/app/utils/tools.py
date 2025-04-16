from typing import Dict, List, Any

# Define available function declarations that can be used with Gemini

CALCULATOR_TOOL = {
    "name": "calculator",
    "description": "Perform mathematical calculations.",
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "The mathematical expression to evaluate, e.g. '(3 + 4) * 5'."
            }
        },
        "required": ["expression"]
    }
}

WEATHER_TOOL = {
    "name": "get_current_weather",
    "description": "Get the current weather in a given location.",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA or a zip code e.g. 95616."
            },
            "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "The temperature unit to use. Infer this from the user's location."
            }
        },
        "required": ["location"]
    }
}

DATE_TIME_TOOL = {
    "name": "get_current_datetime",
    "description": "Get the current date and time for a specific timezone.",
    "parameters": {
        "type": "object",
        "properties": {
            "timezone": {
                "type": "string",
                "description": "The timezone to get the current date and time for, e.g. 'America/New_York', 'Europe/London', 'Asia/Tokyo'."
            }
        },
        "required": ["timezone"]
    }
}

SEARCH_TOOL = {
    "name": "search_information",
    "description": "Search for information on a specific topic.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query."
            },
            "num_results": {
                "type": "integer",
                "description": "The number of results to return."
            }
        },
        "required": ["query"]
    }
}

# Implementations of tool functions that will be called by the backend
# These are mock implementations and should be replaced with actual implementations

def calculator(expression: str) -> Dict[str, Any]:
    """Calculate the result of a mathematical expression."""
    try:
        # WARNING: Using eval is dangerous in production. 
        # This is just for demonstration purposes.
        result = eval(expression)
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}

def get_current_weather(location: str, unit: str = "celsius") -> Dict[str, Any]:
    """Get current weather information (mock implementation)."""
    # In a real application, this would call a weather API
    mock_data = {
        "New York, NY": {"temperature": 22, "condition": "Sunny", "humidity": 60},
        "San Francisco, CA": {"temperature": 18, "condition": "Foggy", "humidity": 75},
        "London": {"temperature": 15, "condition": "Rainy", "humidity": 80},
        "Tokyo": {"temperature": 28, "condition": "Clear", "humidity": 65},
    }
    
    # Convert temperature if needed
    weather = mock_data.get(location, {"temperature": 20, "condition": "Unknown", "humidity": 70})
    
    if unit == "fahrenheit":
        weather["temperature"] = (weather["temperature"] * 9/5) + 32
        
    return {
        "location": location,
        "temperature": weather["temperature"],
        "unit": unit,
        "condition": weather["condition"],
        "humidity": weather["humidity"]
    }

def get_current_datetime(timezone: str) -> Dict[str, Any]:
    """Get current date and time for a timezone (mock implementation)."""
    from datetime import datetime
    import pytz
    
    try:
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        return {
            "timezone": timezone,
            "datetime": now.strftime("%Y-%m-%d %H:%M:%S %Z%z"),
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M:%S"),
            "day_of_week": now.strftime("%A")
        }
    except Exception as e:
        return {"error": str(e)}

def search_information(query: str, num_results: int = 3) -> Dict[str, Any]:
    """Search for information (mock implementation)."""
    # In a real application, this would call a search API
    mock_results = [
        {"title": f"Result 1 for {query}", "snippet": f"This is a snippet of information about {query}..."},
        {"title": f"Result 2 for {query}", "snippet": f"Another piece of information related to {query}..."},
        {"title": f"Result 3 for {query}", "snippet": f"More details about {query} and related topics..."},
        {"title": f"Result 4 for {query}", "snippet": f"Additional information regarding {query}..."},
        {"title": f"Result 5 for {query}", "snippet": f"Further exploration of topics related to {query}..."},
    ]
    
    return {
        "query": query,
        "results": mock_results[:min(num_results, len(mock_results))]
    }

# Map of tool names to their implementations
TOOL_FUNCTIONS = {
    "calculator": calculator,
    "get_current_weather": get_current_weather,
    "get_current_datetime": get_current_datetime,
    "search_information": search_information
}

# Map of tool names to their declarations
TOOL_DECLARATIONS = {
    "calculator": CALCULATOR_TOOL,
    "weather": WEATHER_TOOL,
    "datetime": DATE_TIME_TOOL,
    "search": SEARCH_TOOL
}

def get_enabled_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
    """Get tool declarations for specified tool names."""
    tool_configs = []
    
    for name in tool_names:
        if name in TOOL_DECLARATIONS:
            tool_configs.append({"function_declarations": [TOOL_DECLARATIONS[name]]})
    
    return tool_configs

def execute_tool(tool_name: str, **kwargs) -> Dict[str, Any]:
    """Execute a tool function with the provided arguments."""
    if tool_name not in TOOL_FUNCTIONS:
        return {"error": f"Tool {tool_name} not found"}
        
    try:
        return TOOL_FUNCTIONS[tool_name](**kwargs)
    except Exception as e:
        return {"error": str(e)} 