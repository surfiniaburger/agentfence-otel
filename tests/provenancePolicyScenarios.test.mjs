import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTool } from "../lib/policy.js";
import { runAllProvenanceScenarios } from "../lib/provenanceScenarioHarness.js";

test("provenance scenarios preserve the apply_fix authorization boundary", () => {
  const scenarios = runAllProvenanceScenarios();

  assert.equal(scenarios.length, 6);

  for (const scenario of scenarios) {
    const policy = evaluateTool("apply_fix", scenario.provenance);

    assert.equal(policy.decision, "approval_required", scenario.scenarioId);
    assert.equal(policy.risk, scenario.expectedPolicyClass === "HIGH_APPROVAL" ? "HIGH" : "CRITICAL");

    if (scenario.expectedPolicyClass === "CRITICAL_APPROVAL") {
      assert.equal(policy.provenanceGate, "UNTRUSTED_CONTEXT", scenario.scenarioId);
    } else {
      assert.equal(Object.hasOwn(policy, "provenanceGate"), false, scenario.scenarioId);
    }
  }
});

test("no provenance scenario can directly authorize apply_fix", () => {
  for (const scenario of runAllProvenanceScenarios()) {
    const policy = evaluateTool("apply_fix", scenario.provenance);
    assert.notEqual(policy.decision, "allow", scenario.scenarioId);
  }
});
