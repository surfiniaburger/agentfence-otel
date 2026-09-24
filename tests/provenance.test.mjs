import test from "node:test";
import assert from "node:assert/strict";
import {
  TRUST,
  initialProvenance,
  markUntrusted,
  deriveProvenance,
  provenanceSummary,
} from "../lib/provenance.js";

test("legacy trusted provenance remains compatible", () => {
  const provenance = initialProvenance();
  assert.equal(provenance.trust, TRUST.TRUSTED);
  assert.deepEqual(provenance.sources, []);
  assert.deepEqual(provenance.path, []);
  assert.equal(provenance.lineage.transformations.length, 0);
});

test("untrusted source creates an immutable lineage root", () => {
  const provenance = markUntrusted(
    initialProvenance(),
    "src/notes.txt",
    "Repository content is untrusted data."
  );

  assert.equal(provenance.trust, TRUST.UNTRUSTED);
  assert.deepEqual(provenance.sources, ["src/notes.txt"]);
  assert.equal(provenance.lineage.rootIds.length, 1);
  assert.equal(provenance.lineage.artifacts[0].type, "source");
  assert.equal(provenance.lineage.artifacts[0].hopCount, 0);
});

test("tool transformation cannot erase untrusted provenance", () => {
  const source = markUntrusted(
    initialProvenance(),
    "src/notes.txt",
    "Repository content is untrusted data."
  );

  const derived = deriveProvenance(source, "scan_repository", { type: "tool_output" });

  assert.equal(derived.trust, TRUST.TAINTED);
  assert.equal(derived.lineage.transformations.length, 1);
  assert.equal(derived.lineage.artifacts.at(-1).type, "tool_output");
  assert.equal(derived.lineage.artifacts.at(-1).hopCount, 1);
  assert.deepEqual(derived.lineage.artifacts.at(-1).parentIds, [source.lineage.artifacts[0].id]);
});

test("LLM transformation remains tainted even when representation changes", () => {
  const source = markUntrusted(
    initialProvenance(),
    "src/notes.txt",
    "Repository content is untrusted data."
  );

  const toolOutput = deriveProvenance(source, "scan_repository", { type: "tool_output" });
  const summary = deriveProvenance(toolOutput, "llm_summary", { type: "llm_derived" });

  assert.equal(summary.trust, TRUST.TAINTED);
  assert.equal(summary.lineage.artifacts.at(-1).type, "llm_derived");
  assert.equal(summary.lineage.artifacts.at(-1).hopCount, 2);
  assert.equal(summary.lineage.transformations.length, 2);
});

test("telemetry summary contains metadata but no raw content", () => {
  const provenance = deriveProvenance(
    markUntrusted(
      initialProvenance(),
      "src/notes.txt",
      "Repository content is untrusted data."
    ),
    "llm_summary",
    { type: "llm_derived" }
  );

  const summary = provenanceSummary(provenance);

  assert.equal(summary.tainted, true);
  assert.equal(summary.rootSourceCount, 1);
  assert.equal(summary.hopCount, 1);
  assert.equal(summary.transformationCount, 1);
  assert.equal(summary.artifactCount, 2);
  assert.equal(Object.hasOwn(summary, "content"), false);
  assert.equal(Object.hasOwn(summary, "prompt"), false);
});
