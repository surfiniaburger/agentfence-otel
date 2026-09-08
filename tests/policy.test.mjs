import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTool } from "../lib/policy.js";
import { initialProvenance } from "../lib/provenance.js";

test("analyze_dataflow is an allowed read-only WebMCP evidence tool", () => {
  const decision = evaluateTool("analyze_dataflow", initialProvenance());
  assert.equal(decision.decision, "allow");
  assert.equal(decision.risk, "LOW");
});

test("unknown tools remain denied by default", () => {
  const decision = evaluateTool("made_up_tool", initialProvenance());
  assert.equal(decision.decision, "deny");
  assert.equal(decision.reason, "Unknown tool is denied by default.");
});
