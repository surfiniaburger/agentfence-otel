import { runAdkLlmTransformation } from "./adkLlmTransform.js";
import {
  initialProvenance,
  markUntrusted,
  deriveProvenance,
  provenanceSummary,
} from "./provenance.js";
import { evaluateTool } from "./policy.js";
import { buildProvenanceReceipt } from "./provenanceReceipt.js";

/**
 * Execute a real ADK-backed provenance chain.
 *
 * Model output is returned as a research artifact, while authorization
 * provenance is maintained independently and carried forward from the
 * untrusted source. The model cannot promote trust.
 */
export async function executeAdkResearchChain({
  source,
  sourceReason = "Research source is untrusted data.",
  input,
  instruction,
  model,
  scenarioId = null,
  beforeLlm = [],
  afterLlm = [],
}) {
  if (!source || !input) {
    throw new TypeError("source and input are required");
  }

  let provenance = markUntrusted(
    initialProvenance(),
    source,
    sourceReason
  );

  const trace = [{
    type: "source",
    name: source,
    summary: provenanceSummary(provenance),
  }];

  for (const operation of beforeLlm) {
    provenance = deriveProvenance(provenance, operation.name, {
      type: operation.type || "tool_output",
    });
    trace.push({
      type: "transform",
      name: operation.name,
      summary: provenanceSummary(provenance),
    });
  }

  const modelResult = await runAdkLlmTransformation({
    input,
    instruction,
    model,
  });

  provenance = deriveProvenance(provenance, "gemini_adk_summary", {
    type: "llm_derived",
  });
  trace.push({
    type: "transform",
    name: "gemini_adk_summary",
    summary: provenanceSummary(provenance),
  });

  for (const operation of afterLlm) {
    provenance = deriveProvenance(provenance, operation.name, {
      type: operation.type || "tool_output",
    });
    trace.push({
      type: "transform",
      name: operation.name,
      summary: provenanceSummary(provenance),
    });
  }

  const policy = evaluateTool("apply_fix", provenance);
  const receipt = buildProvenanceReceipt({
    scenarioId,
    operation: "apply_fix",
    provenance,
    policy,
    outcome: "RESEARCH_ONLY",
  });

  return {
    modelResult,
    provenance,
    summary: provenanceSummary(provenance),
    policy,
    receipt,
    trace,
    mutationExecuted: false,
  };
}
