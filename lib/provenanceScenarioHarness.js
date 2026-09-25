import {
  TRUST,
  initialProvenance,
  markUntrusted,
  deriveProvenance,
  provenanceSummary,
} from "./provenance.js";

const SOURCE = "src/notes.txt";

function untrusted() {
  return markUntrusted(
    initialProvenance(),
    SOURCE,
    "Repository content is untrusted data."
  );
}

export const PROVENANCE_SCENARIOS = [
  {
    id: "C0",
    name: "trusted direct",
    description: "Trusted context reaches the consequential action without an untrusted source.",
    build: () => initialProvenance(),
  },
  {
    id: "C1",
    name: "direct untrusted",
    description: "Repository content directly influences the action context.",
    build: () => untrusted(),
  },
  {
    id: "C2",
    name: "tool transformed",
    description: "Untrusted content is returned through one tool transformation.",
    build: () => deriveProvenance(untrusted(), "tool_a", { type: "tool_output" }),
  },
  {
    id: "C3",
    name: "multi-tool",
    description: "Untrusted content crosses two tool transformations.",
    build: () => {
      const toolA = deriveProvenance(untrusted(), "tool_a", { type: "tool_output" });
      return deriveProvenance(toolA, "tool_b", { type: "tool_output" });
    },
  },
  {
    id: "C4",
    name: "LLM summarized",
    description: "Untrusted content is semantically transformed by an LLM.",
    build: () => deriveProvenance(untrusted(), "llm_summary", { type: "llm_derived" }),
  },
  {
    id: "C5",
    name: "LLM + tools",
    description: "Untrusted content crosses tool, LLM, and tool transformations.",
    build: () => {
      const toolA = deriveProvenance(untrusted(), "tool_a", { type: "tool_output" });
      const summary = deriveProvenance(toolA, "llm_summary", { type: "llm_derived" });
      return deriveProvenance(summary, "tool_b", { type: "tool_output" });
    },
  },
];

export function runProvenanceScenario(scenarioId) {
  const scenario = PROVENANCE_SCENARIOS.find(({ id }) => id === scenarioId);
  if (!scenario) throw new Error(`Unknown provenance scenario: ${scenarioId}`);

  const provenance = scenario.build();
  const summary = provenanceSummary(provenance);

  return {
    scenarioId: scenario.id,
    name: scenario.name,
    description: scenario.description,
    provenance,
    summary,
    expectedPolicyClass:
      provenance.trust === TRUST.TRUSTED ? "HIGH_APPROVAL" : "CRITICAL_APPROVAL",
  };
}

export function runAllProvenanceScenarios() {
  return PROVENANCE_SCENARIOS.map(({ id }) => runProvenanceScenario(id));
}
