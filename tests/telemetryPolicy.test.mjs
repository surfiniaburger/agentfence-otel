import test from "node:test";
import assert from "node:assert/strict";

const SAFE_PREFIXES = ["agentfence."];
const FORBIDDEN_KEYS = ["content", "prompt", "secret", "body", "patch_content"];

function isTelemetryAttributeSafe(key) {
  if (!SAFE_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  return !FORBIDDEN_KEYS.some((token) => key.toLowerCase().includes(token));
}

test("AgentFence telemetry attributes stay on the agentfence namespace", () => {
  assert.equal(isTelemetryAttributeSafe("agentfence.policy.decision"), true);
  assert.equal(isTelemetryAttributeSafe("agentfence.provenance.trust"), true);
  assert.equal(isTelemetryAttributeSafe("agentfence.finding.id"), true);
  assert.equal(isTelemetryAttributeSafe("agentfence.repository.content"), false);
  assert.equal(isTelemetryAttributeSafe("agentfence.prompt.text"), false);
});
