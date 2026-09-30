# LangGraph Agentic AI Chatbot — TypeScript

TypeScript port of the Python LangGraph chatbot. It uses **LangGraph.js** to build
a ReAct agent, **Express** to serve a REST API, and a plain **HTML/JS** web UI.
It optionally augments answers with live web search via **Tavily**.

This mirrors the Python version's three-layer architecture:

| Python file        | TypeScript equivalent   | Role                              |
| ------------------ | ----------------------- | --------------------------------- |
| `code/ai_agent.py` | `src/aiAgent.ts`        | Agent creation logic              |
| `code/backend.py`  | `src/backend.ts`        | REST API + schema validation      |
| `code/frontend.py` | `public/index.html`     | Web UI (replaces Streamlit)       |
| `requirements.txt` | `package.json`          | Dependencies                      |

## Library mapping (Python → TypeScript)

| Python                | TypeScript                | Purpose                         |
| --------------------- | ------------------------- | ------------------------------- |
| `langgraph`           | `@langchain/langgraph`    | `createReactAgent` ReAct loop   |
| `langchain-groq`      | `@langchain/groq`         | `ChatGroq` LLM wrapper          |
| `langchain-openai`    | `@langchain/openai`       | `ChatOpenAI` LLM wrapper        |
| `langchain-tavily`    | `@langchain/tavily`       | `TavilySearch` web-search tool  |
| `langchain` (core)    | `@langchain/core`         | `AIMessage` message types       |
| `fastapi` + `uvicorn` | `express`                 | HTTP API server                 |
| `pydantic`            | `zod`                     | Request schema validation       |
| `streamlit`           | static HTML/JS in `public`| Frontend UI                     |
| `python-dotenv`       | `dotenv`                  | Load API keys from `.env`       |
| `requests`            | `fetch` (browser built-in)| Frontend → backend HTTP calls   |

## Supported models

- **Groq:** `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
- **OpenAI:** `gpt-4o-mini`

(The backend allowlist also accepts `llama3-70b-8192`, matching the Python project.)

## Prerequisites

- Node.js 18 or newer

## Setup

1. Move into the TypeScript folder:

   ```bash
   cd typescript
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your `.env` file from the template and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   ```bash
   GROQ_API_KEY=your_groq_api_key
   OPENAI_API_KEY=your_openai_api_key
   TAVILY_API_KEY=your_tavily_api_key
   PORT=9999
   ```

## Run

Start the backend (it also serves the frontend):

```bash
npm run backend
```

Then open the UI in your browser:

```
http://127.0.0.1:9999
```

For auto-reload during development:

```bash
npm run dev
```

## Test the API directly

```bash
curl -X POST http://127.0.0.1:9999/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "llama-3.3-70b-versatile",
    "model_provider": "Groq",
    "system_prompt": "Act as a helpful assistant",
    "messages": ["What is LangGraph?"],
    "allow_search": false
  }'
```

## How it works (request flow)

```
Browser UI (public/index.html)
   │  fetch POST /chat  (JSON payload)
   ▼
Express server (src/backend.ts)
   │  zod validates the payload + checks model allowlist
   ▼
Agent function (src/aiAgent.ts)
   │  picks ChatGroq / ChatOpenAI
   │  attaches TavilySearch if allow_search
   │  createReactAgent(...).invoke({ messages })
   ▼
Final AIMessage content ──► returned as JSON ──► rendered in the UI
```

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run backend`   | Run the server with `tsx` (no build step)    |
| `npm run dev`       | Run with auto-reload on file changes         |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `npm run build`     | Compile TypeScript to `dist/`                |
| `npm start`         | Run the compiled JS from `dist/`             |

## Notes

- You need valid API keys for whichever provider you select.
- Tavily is optional and only used when "Allow to search the web" is checked.
- The frontend is served from the same origin as the API, so there are no CORS issues.
