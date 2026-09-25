import test from "node:test";
import assert from "node:assert/strict";
import {
  executeResearchChain,
  researchOps,
} from "../lib/provenanceResearchExecutor.js";

const source = researchOps.source("src/notes.txt");

test("research executor preserves taint through tool chains", () => {
  const result = executeResearchChain([
    source,
    researchOps.tool("scan_repository"),
    researchOps.tool("inspect_finding"),
    researchOps.consequential("apply_fix", "C3"),
  ]);

  assert.equal(result.policy.decision, "approval_required");
  assert.equal(result.policy.risk, "CRITICAL");
  assert.equal(result.policy.provenanceGate, "UNTRUSTED_CONTEXT");
  assert.equal(result.summary.hopCount, 2);
  assert.equal(result.summary.transformationCount, 2);
  assert.equal(result.mutationExecuted, false);
});

test("research executor preserves taint through an LLM transformation", () => {
  const result = executeResearchChain([
    source,
    researchOps.llm(),
    researchOps.consequential("apply_fix", "C4"),
  ]);

  assert.equal(result.provenance.trust, "TAINTED");
  assert.equal(result.policy.decision, "approval_required");
  assert.equal(result.policy.risk, "CRITICAL");
  assert.equal(result.policy.provenanceGate, "UNTRUSTED_CONTEXT");
  assert.equal(result.summary.hopCount, 1);
});

test("research executor preserves taint across tool → LLM → tool", () => {
  const result = executeResearchChain([
    source,
    researchOps.tool("scan_repository"),
    researchOps.llm("llm_summary"),
    researchOps.tool("propose_fix"),
    researchOps.consequential("apply_fix", "C5"),
  ]);

  assert.equal(result.provenance.trust, "TAINTED");
  assert.equal(result.summary.hopCount, 3);
  assert.equal(result.summary.transformationCount, 3);
  assert.equal(result.policy.decision, "approval_required");
  assert.equal(result.policy.provenanceGate, "UNTRUSTED_CONTEXT");
  assert.equal(result.mutationExecuted, false);

  assert.deepEqual(
    result.provenance.lineage.transformations.map((item) => item.operation),
    ["scan_repository", "llm_summary", "propose_fix"]
  );
});

test("research executor records a content-free receipt", () => {
  const result = executeResearchChain([
    source,
    researchOps.llm(),
    researchOps.consequential("apply_fix", "C4"),
  ]);

  assert.equal(result.receipt.outcome, "RESEARCH_ONLY");
  assert.equal(result.receipt.provenance.hopCount, 1);
  assert.equal(Object.hasOwn(result.receipt, "content"), false);
  assert.equal(Object.hasOwn(result.receipt, "prompt"), false);
  assert.equal(Object.hasOwn(result.receipt, "patch"), false);
});
