import { provenanceSummary } from "./provenance.js";

const SENSITIVE_KEYS = new Set([
  "content",
  "prompt",
  "body",
  "patch",
  "raw",
  "output",
]);

/**
 * Build a content-free research/security receipt from an AgentFence provenance
 * context and its final policy decision. The receipt is intentionally metadata
 * only: repository text, prompts, model output, and patch bodies never cross
 * this boundary.
 */
export function buildProvenanceReceipt({
  scenarioId,
  operation,
  provenance,
  policy,
  outcome = "OBSERVED",
}) {
  const summary = provenanceSummary(provenance);

  return {
    receiptVersion: 1,
    scenarioId: scenarioId || null,
    operation: operation || null,
    outcome,
    provenance: summary,
    policy: {
      decision: policy?.decision || null,
      risk: policy?.risk || null,
      provenanceGate: policy?.provenanceGate || null,
    },
  };
}

export function assertTelemetrySafe(value) {
  const serialized = JSON.stringify(value);
  for (const key of SENSITIVE_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`Telemetry receipt contains prohibited key: ${key}`);
    }
  }
  return value;
}
