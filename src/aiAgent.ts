// Step 1: Load environment variables (API keys for Groq / OpenAI / Tavily).
// This mirrors `load_dotenv()` in the Python version.
import "dotenv/config";

// Step 2: Import LLM wrappers, the optional web-search tool, the ReAct agent
// builder, and the message type used to identify AI replies.
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Provider union — same two options as the Python project ("Groq" | "OpenAI").
export type Provider = "Groq" | "OpenAI";

// Arguments for the agent call, mirroring the Python function signature.
export interface AgentRequest {
  llmId: string; // model id, e.g. "llama-3.3-70b-versatile" or "gpt-4o-mini"
  query: string[]; // user messages (list of strings, like the Python schema)
  allowSearch: boolean; // toggles the Tavily web-search tool
  systemPrompt: string; // system instructions injected before the conversation
  provider: Provider; // "Groq" or "OpenAI"
}

/**
 * Build a fresh ReAct agent and return the assistant's final reply.
 *
 * This is the TypeScript equivalent of `get_response_from_ai_agent` in
 * `code/ai_agent.py`. The flow is identical:
 *   1. pick the LLM based on the provider,
 *   2. attach the Tavily tool only when search is allowed,
 *   3. build a prebuilt ReAct agent (LangGraph),
 *   4. invoke it with the conversation state,
 *   5. return the content of the last AI message.
 */
export async function getResponseFromAiAgent(
  req: AgentRequest,
): Promise<string> {
  const { llmId, query, allowSearch, systemPrompt, provider } = req;

  // Step 1: Dynamically select the LLM based on provider.
  // The API keys are read automatically from the environment by each wrapper.
  const llm: BaseChatModel =
    provider === "Groq"
      ? new ChatGroq({ model: llmId })
      : new ChatOpenAI({ model: llmId });

  // Step 2: Enable tools only if web search is requested (max 2 results).
  const tools = allowSearch ? [new TavilySearch({ maxResults: 2 })] : [];

  // Step 3: Create the reactive agent using LangGraph's prebuilt helper.
  // `stateModifier` injects the system prompt, matching `prompt=` in Python.
  const agent = createReactAgent({
    llm,
    tools,
    stateModifier: systemPrompt || "You are a helpful AI assistant.",
  });

  // Step 4: Prepare the agent state. LangGraph expects a `messages` array.
  // Each user string becomes a ["user", text] tuple message.
  const messages = query.map((text) => ["user", text] as [string, string]);

  // Step 5: Run the agent graph (Reason -> optionally Act via Tavily -> Reason).
  const response = await agent.invoke({ messages });

  // Step 6: Keep only AI-generated messages and return the last one's content.
  const outMessages = (response.messages ?? []) as BaseMessage[];
  const aiMessages = outMessages.filter((m) => m instanceof AIMessage);

  if (aiMessages.length === 0) {
    return "No response generated.";
  }

  const last = aiMessages[aiMessages.length - 1];
  // Message content can be a string or an array of content blocks; normalize it.
  return typeof last.content === "string"
    ? last.content
    : JSON.stringify(last.content);
}
