import test from "node:test";
import assert from "node:assert/strict";
import {
  TRUST,
  initialProvenance,
  markUntrusted,
  deriveProvenance,
  provenanceSummary,
} from "../lib/provenance.js";

function trustedScenario() {
  return initialProvenance();
}

function directUntrustedScenario() {
  return markUntrusted(
    initialProvenance(),
    "src/notes.txt",
    "Repository content is untrusted data."
  );
}

function toolScenario() {
  const source = directUntrustedScenario();
  return deriveProvenance(source, "tool_a", { type: "tool_output" });
}

function multiToolScenario() {
  const source = directUntrustedScenario();
  const toolA = deriveProvenance(source, "tool_a", { type: "tool_output" });
  return deriveProvenance(toolA, "tool_b", { type: "tool_output" });
}

function llmScenario() {
  const source = directUntrustedScenario();
  return deriveProvenance(source, "llm_summary", { type: "llm_derived" });
}

function llmAndToolsScenario() {
  const source = directUntrustedScenario();
  const toolA = deriveProvenance(source, "tool_a", { type: "tool_output" });
  const summary = deriveProvenance(toolA, "llm_summary", { type: "llm_derived" });
  return deriveProvenance(summary, "tool_b", { type: "tool_output" });
}

const scenarios = [
  ["C0", "trusted direct", trustedScenario, TRUST.TRUSTED, 0],
  ["C1", "direct untrusted", directUntrustedScenario, TRUST.UNTRUSTED, 0],
  ["C2", "tool transformed", toolScenario, TRUST.TAINTED, 1],
  ["C3", "multi-tool", multiToolScenario, TRUST.TAINTED, 2],
  ["C4", "LLM summarized", llmScenario, TRUST.TAINTED, 1],
  ["C5", "LLM + tools", llmAndToolsScenario, TRUST.TAINTED, 3],
];

for (const [id, name, build, expectedTrust, expectedHops] of scenarios) {
  test(`${id}: ${name} preserves provenance`, () => {
    const provenance = build();
    const summary = provenanceSummary(provenance);

    assert.equal(provenance.trust, expectedTrust);
    assert.equal(summary.hopCount, expectedHops);
    assert.equal(summary.rootSourceCount, expectedTrust === TRUST.TRUSTED ? 0 : 1);

    if (expectedTrust !== TRUST.TRUSTED) {
      assert.equal(summary.tainted, true);
      assert.equal(summary.inherited, expectedHops > 0);
      assert.equal(provenance.sources[0], "src/notes.txt");
    }
  });
}

test("C5 lineage preserves every transformation in order", () => {
  const provenance = llmAndToolsScenario();
  const operations = provenance.lineage.transformations.map((item) => item.operation);

  assert.deepEqual(operations, [
    "tool_a",
    "llm_summary",
    "tool_b",
  ]);

  assert.equal(provenance.lineage.artifacts.length, 4);
  assert.equal(provenance.lineage.artifacts[0].type, "source");
  assert.deepEqual(
    provenance.lineage.artifacts.at(-1).parentIds,
    [provenance.lineage.artifacts.at(-2).id]
  );
});

test("C4 cannot become trusted because the LLM output is semantically benign", () => {
  const provenance = llmScenario();

  // The harness intentionally does not inspect or trust the transformed text.
  // Provenance is inherited from the source rather than inferred from content.
  assert.equal(provenance.trust, TRUST.TAINTED);
  assert.equal(provenance.lineage.artifacts.at(-1).type, "llm_derived");
});

test("scenario summaries are telemetry-safe", () => {
  for (const [, , build] of scenarios) {
    const summary = provenanceSummary(build());
    assert.equal(Object.hasOwn(summary, "content"), false);
    assert.equal(Object.hasOwn(summary, "prompt"), false);
    assert.equal(Object.hasOwn(summary, "body"), false);
    assert.equal(Object.hasOwn(summary, "patch"), false);
  }
});
