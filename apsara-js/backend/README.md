# Gemini API Backend

Backend server for Google's Gemini AI models, powering the Apsara 2.5 frontend.

---

## ✨ Features

- ✅ **Support for all Gemini models** (1.5, 2.0, 2.5 series)
- ✅ **Real-time Streaming Responses**
- ✅ **Image Input and Image Generation** (Imagen 3, Gemini image-gen)
- ✅ **System Instruction Customization** (dynamic prompt control)
- ✅ **JSON Mode with Schema Validation**
- ✅ **Google Search Grounding & Dynamic Retrieval**
- ✅ **Thinking Budget Configuration**
- ✅ **Native Function Calling and Code Execution**
- ✅ **File Uploads and Custom Grounding Support**
- ✅ **WebSocket Live Chat** (text, audio, video)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later recommended)
- Google Gemini API Key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and insert your Google Gemini API key
```

### Running the Server

```bash
npm start
```

By default, the backend server runs at:  
> **http://localhost:9000**

You can customize the port using the `PORT` environment variable.

---

## 📚 API Endpoints

| Method | Endpoint                   | Description                              |
|:------:|:--------------------------- |:---------------------------------------- |
| `GET`  | `/health`                   | Health check endpoint                   |
| `GET`  | `/models`                   | Fetch available Gemini models           |
| `GET`  | `/voices`                   | List supported TTS voice names          |
| `POST` | `/voices/select`             | Select TTS voice for session            |
| `GET`  | `/system`                   | Get current system instruction          |
| `POST` | `/system`                   | Update system instruction dynamically   |
| `GET`  | `/tools`                    | List available function-calling tools   |
| `POST` | `/tools/invoke`              | Manually invoke a server tool           |
| `POST` | `/files`                    | Upload a file for grounding             |
| `GET`  | `/files`                    | List uploaded files                     |
| `POST` | `/chat`                     | Send a chat message and get full response |
| `POST` | `/chat/stream`              | Send a chat message and stream response |
| `POST` | `/chat/function-result`     | Send function call results back to model |
| `WebSocket` | `/live`                | Live session bridge (Text/Audio/Video)  |

---

## 🛠️ Environment Variables

| Variable         | Description                                 |
|------------------|---------------------------------------------|
| `GEMINI_API_KEY`  | **Required**. Your Google Gemini API key   |
| `PORT`            | Optional. Server port (default: `9000`)    |

---

## 📦 Project Structure

```bash
├── server.js        # Main backend server (Express + WebSocket)
├── package.json     # Dependencies and scripts
├── public/          # Static frontend assets (optional)
├── uploads/         # Uploaded user files (if any)
└── .env             # Environment variables
```

---

## 🧩 Notes

- Seamless support for Gemini 1.5, 2.0, and 2.5 models.
- Fully modular architecture: models, tools, voices, system instructions, file uploads.
- Streaming responses via Server-Sent Events (SSE) and WebSocket.
- Function-calling with Google's native FunctionCallingConfig.
- Real-time grounding with file uploads and search.

---

## 💬 License

MIT License (or your preferred license)

---

> Built with ❤️ for Apsara 2.5


