import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTool } from "../lib/policy.js";
import { runAllProvenanceScenarios } from "../lib/provenanceScenarioHarness.js";
import {
  assertTelemetrySafe,
  buildProvenanceReceipt,
} from "../lib/provenanceReceipt.js";

test("C0-C5 produce sanitized policy-boundary receipts", () => {
  for (const scenario of runAllProvenanceScenarios()) {
    const policy = evaluateTool("apply_fix", scenario.provenance);
    const receipt = buildProvenanceReceipt({
      scenarioId: scenario.scenarioId,
      operation: "apply_fix",
      provenance: scenario.provenance,
      policy,
    });

    assert.equal(receipt.receiptVersion, 1);
    assert.equal(receipt.operation, "apply_fix");
    assert.equal(receipt.policy.decision, "approval_required");

    if (scenario.scenarioId === "C0") {
      assert.equal(receipt.policy.risk, "HIGH");
      assert.equal(receipt.policy.provenanceGate, null);
    } else {
      assert.equal(receipt.policy.risk, "CRITICAL");
      assert.equal(receipt.policy.provenanceGate, "UNTRUSTED_CONTEXT");
    }

    assertTelemetrySafe(receipt);
  }
});

test("receipt exposes lineage metadata but never repository or model content", () => {
  const scenario = runAllProvenanceScenarios().find(({ scenarioId }) => scenarioId === "C5");
  const policy = evaluateTool("apply_fix", scenario.provenance);
  const receipt = buildProvenanceReceipt({
    scenarioId: "C5",
    operation: "apply_fix",
    provenance: scenario.provenance,
    policy,
  });

  assert.equal(receipt.provenance.hopCount, 3);
  assert.equal(receipt.provenance.transformationCount, 3);
  assert.equal(receipt.provenance.rootSourceCount, 1);
  assert.equal(Object.hasOwn(receipt, "content"), false);
  assert.equal(Object.hasOwn(receipt, "prompt"), false);
  assert.equal(Object.hasOwn(receipt, "body"), false);
  assert.equal(Object.hasOwn(receipt, "patch"), false);
  assertTelemetrySafe(receipt);
});
