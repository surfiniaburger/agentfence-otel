import {
  initialProvenance,
  markUntrusted,
  deriveProvenance,
  provenanceSummary,
} from "./provenance.js";
import { evaluateTool } from "./policy.js";
import { buildProvenanceReceipt } from "./provenanceReceipt.js";

function applyOperation(provenance, operation) {
  if (operation.type === "source") {
    return markUntrusted(
      provenance,
      operation.source,
      operation.reason || "Research source is untrusted data."
    );
  }

  if (operation.type === "transform") {
    return deriveProvenance(provenance, operation.name, {
      type: operation.transformType || "research_transform",
    });
  }

  return provenance;
}

/**
 * Execute a deterministic research-only transformation chain.
 *
 * This deliberately does not invoke production WebMCP handlers or mutate repo
 * state. It models information movement up to the consequential policy
 * boundary so provenance behavior can be tested independently.
 */
export function executeResearchChain(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new TypeError("operations must be a non-empty array");
  }

  let provenance = initialProvenance();
  const trace = [];

  for (const operation of operations) {
    if (!operation?.type) {
      throw new TypeError("Every research operation requires a type.");
    }

    provenance = applyOperation(provenance, operation);
    trace.push({
      type: operation.type,
      name: operation.name || operation.source || null,
      summary: provenanceSummary(provenance),
    });
  }

  const finalOperation = operations.at(-1);
  const policy = evaluateTool(
    finalOperation.type === "consequential" ? finalOperation.name : "apply_fix",
    provenance
  );

  const receipt = buildProvenanceReceipt({
    scenarioId: finalOperation.scenarioId || null,
    operation: finalOperation.name || "apply_fix",
    provenance,
    policy,
    outcome: "RESEARCH_ONLY",
  });

  return {
    provenance,
    summary: provenanceSummary(provenance),
    policy,
    receipt,
    trace,
    mutationExecuted: false,
  };
}

export const researchOps = {
  source(source, reason) {
    return { type: "source", source, reason };
  },

  tool(name) {
    return { type: "transform", name, transformType: "tool_output" };
  },

  llm(name = "llm_summary") {
    return { type: "transform", name, transformType: "llm_derived" };
  },

  consequential(name = "apply_fix", scenarioId = null) {
    return { type: "consequential", name, scenarioId };
  },
};
