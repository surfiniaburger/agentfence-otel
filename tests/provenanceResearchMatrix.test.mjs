import test from "node:test";
import assert from "node:assert/strict";
import {
  executeResearchChain,
  researchOps,
} from "../lib/provenanceResearchExecutor.js";

const cases = [
  {
    id: "C0",
    ops: [
      researchOps.consequential("apply_fix", "C0"),
    ],
    trust: "TRUSTED",
    hops: 0,
    transforms: 0,
    risk: "HIGH",
    gate: null,
  },
  {
    id: "C1",
    ops: [
      researchOps.source("src/notes.txt"),
      researchOps.consequential("apply_fix", "C1"),
    ],
    trust: "UNTRUSTED",
    hops: 0,
    transforms: 0,
    risk: "CRITICAL",
    gate: "UNTRUSTED_CONTEXT",
  },
  {
    id: "C2",
    ops: [
      researchOps.source("src/notes.txt"),
      researchOps.tool("scan_repository"),
      researchOps.consequential("apply_fix", "C2"),
    ],
    trust: "TAINTED",
    hops: 1,
    transforms: 1,
    risk: "CRITICAL",
    gate: "UNTRUSTED_CONTEXT",
  },
  {
    id: "C3",
    ops: [
      researchOps.source("src/notes.txt"),
      researchOps.tool("scan_repository"),
      researchOps.tool("inspect_finding"),
      researchOps.consequential("apply_fix", "C3"),
    ],
    trust: "TAINTED",
    hops: 2,
    transforms: 2,
    risk: "CRITICAL",
    gate: "UNTRUSTED_CONTEXT",
  },
  {
    id: "C4",
    ops: [
      researchOps.source("src/notes.txt"),
      researchOps.llm("llm_summary"),
      researchOps.consequential("apply_fix", "C4"),
    ],
    trust: "TAINTED",
    hops: 1,
    transforms: 1,
    risk: "CRITICAL",
    gate: "UNTRUSTED_CONTEXT",
  },
  {
    id: "C5",
    ops: [
      researchOps.source("src/notes.txt"),
      researchOps.tool("scan_repository"),
      researchOps.llm("llm_summary"),
      researchOps.tool("propose_fix"),
      researchOps.consequential("apply_fix", "C5"),
    ],
    trust: "TAINTED",
    hops: 3,
    transforms: 3,
    risk: "CRITICAL",
    gate: "UNTRUSTED_CONTEXT",
  },
];

test("C0-C5 share one executable research-chain contract", () => {
  for (const expected of cases) {
    const result = executeResearchChain(expected.ops);

    assert.equal(result.receipt.scenarioId, expected.id);
    assert.equal(result.provenance.trust, expected.trust);
    assert.equal(result.summary.hopCount, expected.hops);
    assert.equal(result.summary.transformationCount, expected.transforms);
    assert.equal(result.policy.decision, "approval_required");
    assert.equal(result.policy.risk, expected.risk);
    assert.equal(result.policy.provenanceGate ?? null, expected.gate);
    assert.equal(result.mutationExecuted, false);
  }
});

test("C0-C5 transformation lineage is ordered and content-free", () => {
  for (const expected of cases) {
    const result = executeResearchChain(expected.ops);
    const operations = result.provenance.lineage.transformations.map(
      (item) => item.operation
    );

    const expectedOperations = expected.ops
      .filter((item) => item.type === "transform")
      .map((item) => item.name);

    assert.deepEqual(operations, expectedOperations);
    assert.equal(Object.hasOwn(result.receipt, "content"), false);
    assert.equal(Object.hasOwn(result.receipt, "prompt"), false);
    assert.equal(Object.hasOwn(result.receipt, "patch"), false);
  }
});
