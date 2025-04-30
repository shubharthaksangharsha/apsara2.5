# Apsara 2.5 Frontend

A beautiful modern UI frontend for Google's Gemini AI models, developed by shubharthak.

## Features

- Support for all Gemini models (1.5, 2.0, 2.5 series)
- Streaming responses for real-time interaction
- Image input and generation capabilities
- System instruction customization
- JSON mode with schema support
- Google Search grounding
- Thinking budget configuration for Gemini 2.5 models
- Markdown and code highlighting
- Conversation history with local storage
- Mobile-responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- A backend server running the Gemini API wrapper (backend folder)

### Installation

1. Install dependencies

```bash
npm install
```

2. Start the frontend server

```bash
npm start
```

By default, the frontend will run on port 3000 and try to connect to the backend API on port 9000. You can configure these using environment variables:

```bash
PORT=4000 API_PORT=8000 API_HOST=localhost npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Select a model from the dropdown menu
3. Configure any advanced options through the settings button
4. Type a message or attach an image to start chatting
5. Use the streaming toggle in settings for real-time responses
6. For image generation, select an image generation model and provide a text prompt

## Environment Variables

- `PORT`: Frontend server port (default: 3000)
- `API_PORT`: Backend API port (default: 9000)
- `API_HOST`: Backend API host (default: localhost)

## License

MIT

## Credits

Developed by shubharthak 