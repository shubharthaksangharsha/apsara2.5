# Apsara 2.5 Backend

Backend server for Apsara 2.5, a Gemini-powered chat application.

## Features

- Conversation management with session tracking
- Multi-turn conversations with various Gemini models
- Message editing with history regeneration
- Support for multiple models (Gemini 2.5 Pro, 2.0 Flash, 1.5 Pro, etc.)
- Tool capabilities (calculator, weather, date/time, search)
- Image generation with Gemini and Imagen
- Automatic model selection based on query complexity

## Requirements

- Python 3.9+
- FastAPI
- Google Generative AI SDK
- Pillow (for image processing)

## Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd apsara_backend
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Set up environment variables**

Create a `.env` file in the project root with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

You can obtain an API key from [Google AI Studio](https://ai.google.dev/).

4. **Run the server**

```bash
python run.py
```

The server will start at `http://localhost:8000`.

## API Documentation

Once the server is running, you can access the API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Chat

- `POST /chat/sessions` - Create a new chat session
- `GET /chat/sessions` - Get all chat sessions
- `GET /chat/sessions/{session_id}` - Get details of a specific session
- `DELETE /chat/sessions/{session_id}` - Delete a chat session
- `POST /chat/messages` - Send a message and get a response
- `POST /chat/messages/edit` - Edit a message and regenerate responses
- `GET /chat/messages/{session_id}` - Get all messages for a session

### Models

- `GET /models` - Get all available models
- `GET /models/{model_id}` - Get information about a specific model
- `POST /models/select` - Select the best model based on a query

### Tools

- `GET /tools` - Get all available tools
- `GET /tools/{tool_name}` - Get information about a specific tool
- `POST /tools/execute` - Execute a tool with given arguments

### Images

- `POST /images/generate` - Generate images using Gemini or Imagen

## Project Structure

```
apsara_backend/
├── app/
│   ├── models/       # Data models
│   ├── routers/      # API endpoints
│   ├── utils/        # Utility functions
│   └── main.py       # FastAPI application
├── data/
│   └── history/      # Conversation history storage
├── .env              # Environment variables
├── requirements.txt  # Dependencies
├── run.py            # Server startup script
└── README.md         # This file
```

## Contributing

1. Create a fork of the repository
2. Create a new branch for your feature
3. Add your changes
4. Submit a pull request

## License

[MIT License](LICENSE) 