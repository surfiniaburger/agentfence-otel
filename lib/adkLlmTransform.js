import { LlmAgent, InMemoryRunner, isFinalResponse } from "@google/adk";

const DEFAULT_MODEL = process.env.AGENTFENCE_ADK_MODEL || "gemini-2.5-flash";

function requireApiKey() {
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error(
      "A Google API key is required. Set GOOGLE_API_KEY or GEMINI_API_KEY."
    );
  }
}

/**
 * Run a real Google ADK LlmAgent as a provenance transformation.
 *
 * The model receives only the supplied input representation. Provenance is
 * tracked outside the model and must be explicitly inherited by the caller.
 * This function returns model output as data; it does not authorize or mutate.
 */
export async function runAdkLlmTransformation({
  input,
  instruction = "Summarize the supplied security analysis without changing its meaning.",
  model = DEFAULT_MODEL,
  appName = "agentfence_provenance_research",
  userId = "research_user",
}) {
  requireApiKey();

  const agent = new LlmAgent({
    name: "provenance_transformer",
    model,
    instruction,
  });

  const runner = new InMemoryRunner({ agent, appName });
  const session = await runner.sessionService.createSession({
    appName,
    userId,
  });

  const events = [];
  for await (const event of runner.runAsync({
    userId,
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [{ text: input }],
    },
  })) {
    events.push(event);
  }

  const textParts = events.flatMap((event) =>
    (event.content?.parts || [])
      .map((part) => part.text)
      .filter(Boolean)
  );

  const output = textParts.at(-1) || "";
  if (!output) {
    throw new Error("ADK transformation produced no text response.");
  }

  return {
    model,
    output,
    eventCount: events.length,
    finalResponseObserved: events.some((event) => isFinalResponse(event)),
  };
}
