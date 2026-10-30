// Step 0: Load env vars first, before anything reads process.env.
import "dotenv/config";

// Step 1: Imports. Express is our web framework (FastAPI equivalent);
// zod does request schema validation (Pydantic equivalent).
import express, { type Request, type Response } from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import { getResponseFromAiAgent, type Provider } from "./aiAgent.js";

// Resolve paths so we can serve the static frontend regardless of CWD.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Step 2: Define the request schema (mirrors the Pydantic `RequestState`).
// zod both validates types AND infers a static TypeScript type for us.
const RequestState = z.object({
  model_name: z.string(),
  model_provider: z.enum(["Groq", "OpenAI"]),
  system_prompt: z.string().default(""),
  messages: z.array(z.string()).min(1),
  allow_search: z.boolean(),
});

// Allowed models to reject invalid requests (mirrors ALLOWED_MODEL_NAMES).
const ALLOWED_MODEL_NAMES = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "llama-3.3-70b-versatile",
  "gpt-4o-mini",
];

// Step 3: Create the Express app and wire middleware.
const app = express();
app.use(cors());
app.use(express.json());

// Serve the static frontend (public/index.html) at the root URL.
app.use(express.static(join(__dirname, "..", "public")));

// Step 4: The /chat endpoint — the FastAPI @app.post("/chat") equivalent.
app.post("/chat", async (req: Request, res: Response) => {
  // Validate the incoming payload against the schema.
  const parsed = RequestState.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(422)
      .json({ error: "Invalid request payload", details: parsed.error.issues });
  }

  const request = parsed.data;

  // Validate model name against the allowlist.
  if (!ALLOWED_MODEL_NAMES.includes(request.model_name)) {
    return res
      .status(400)
      .json({ error: "Invalid model name. Kindly select a valid model name." });
  }

  try {
    // Call the agent function to get the response.
    const answer = await getResponseFromAiAgent({
      llmId: request.model_name,
      query: request.messages,
      allowSearch: request.allow_search,
      systemPrompt: request.system_prompt,
      provider: request.model_provider as Provider,
    });

    // Return plain text answer (the frontend renders it directly).
    return res.json(answer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Agent error: ${message}` });
  }
});

// Step 5: Start the server (uvicorn.run equivalent).
const PORT = Number(process.env.PORT ?? 9999);
app.listen(PORT, "127.0.0.1", () => {
  console.log(`LangGraph AI Agent backend running at http://127.0.0.1:${PORT}`);
  console.log(`Open the UI in your browser at http://127.0.0.1:${PORT}`);
});
