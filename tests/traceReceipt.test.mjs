import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const provider = fs.readFileSync(new URL("../components/AgentFenceProvider.js", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../components/SecurityPanel.js", import.meta.url), "utf8");

test("trace-backed receipt contract is present", () => {
  assert.match(provider, /agentfence\.remediation/);
  assert.match(provider, /traceId/);
  assert.match(provider, /"agentfence\.receipt\.trace_id"/);
  assert.match(panel, /Trace-backed security receipt/);
  assert.match(panel, /Trace ID:/);
});
