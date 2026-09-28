import { test, expect } from "@playwright/test";

async function callWebMcpTool(page, name, input = {}) {
  return page.evaluate(async ({ name: toolName, input: toolInput }) => {
    const modelContext = document.modelContext;
    if (!modelContext?.getTools || !modelContext?.executeTool) {
      throw new Error(
        "Native WebMCP is unavailable. Run Chromium with WebMCP enabled; this test does not polyfill document.modelContext."
      );
    }
    const tools = await modelContext.getTools();
    const tool = tools.find((candidate) => candidate.name === toolName);
    if (!tool) {
      throw new Error(
        `WebMCP tool not discovered: ${toolName}. Discovered: ${tools.map((item) => item.name).join(", ")}`
      );
    }
    const result = await modelContext.executeTool(tool, toolInput);
    if (typeof result === "string") {
      try { return JSON.parse(result); } catch { return result; }
    }
    return result;
  }, { name, input });
}

test("WebMCP -> AgentFence -> provenance -> policy -> OTEL E2E", async ({ page }) => {
  await page.goto("/");

  const expectedToolNames = [
    "get_repository", "scan_repository", "analyze_dataflow", "inspect_finding",
    "propose_fix", "simulate_fix", "apply_fix", "run_verification",
  ];

  await expect.poll(async () => page.evaluate(() => Boolean(document.modelContext?.getTools)))
    .toBe(true);

  // Tool registration is asynchronous and the provider registers the tools
  // individually. Wait for the complete capability surface rather than
  // sampling after the first registerTool() promise resolves.
  await expect.poll(async () => page.evaluate(async () => {
    const tools = await document.modelContext.getTools();
    return tools.map((tool) => tool.name);
  })).toEqual(expect.arrayContaining(expectedToolNames));

  const discovered = await page.evaluate(async () =>
    (await document.modelContext.getTools()).map((tool) => ({
      name: tool.name,
      annotations: tool.annotations,
    }))
  );
  const names = discovered.map((tool) => tool.name);
  expect(names).toEqual(expect.arrayContaining(expectedToolNames));

  const writeTool = discovered.find((tool) => tool.name === "apply_fix");
  expect(writeTool?.annotations?.readOnlyHint).toBe(false);
  expect(writeTool?.annotations?.consequentialHint).toBe(true);

  await page.evaluate(() => window.__AGENTFENCE_E2E__?.clearSpans());

  const repository = await callWebMcpTool(page, "get_repository");
  expect(repository.ok).toBe(true);
  expect(repository.untrustedContent?.[0]?.file).toBe("src/notes.txt");

  const scan = await callWebMcpTool(page, "scan_repository", { severity: "high" });
  expect(scan.ok).toBe(true);
  expect(scan.findings?.[0]?.id).toBe("F-001");

  const dataflow = await callWebMcpTool(page, "analyze_dataflow");
  expect(dataflow.ok).toBe(true);

  const inspected = await callWebMcpTool(page, "inspect_finding", { findingId: "F-001" });
  expect(inspected.ok).toBe(true);

  const proposal = await callWebMcpTool(page, "propose_fix", { findingId: "F-001" });
  expect(proposal.ok).toBe(true);
  expect(proposal.provenance?.trust).toBe("TAINTED");

  const simulation = await callWebMcpTool(page, "simulate_fix", { patchId: "P-001" });
  expect(simulation.ok).toBe(true);
  expect(simulation.provenance?.trust).toBe("TAINTED");

  const blocked = await callWebMcpTool(page, "apply_fix", { findingId: "F-001", patchId: "P-001" });
  expect(blocked.ok).toBe(false);
  expect(blocked.status).toBe("PENDING_HUMAN_APPROVAL");
  expect(blocked.request?.risk).toBe("CRITICAL");
  expect(blocked.request?.provenance?.trust).toBe("TAINTED");

  const stillVulnerable = await callWebMcpTool(page, "scan_repository", { severity: "high" });
  expect(stillVulnerable.findings?.[0]?.id).toBe("F-001");

  const telemetry = await page.evaluate(() => window.__AGENTFENCE_E2E__?.getSpans?.() || []);
  expect(telemetry.length).toBeGreaterThan(0);

  const remediation = telemetry.find((span) => span.name === "agentfence.remediation");
  expect(remediation?.traceId).toBeTruthy();

  const toolSpans = telemetry.filter((span) => span.name.startsWith("agentfence.tool."));
  expect(toolSpans.length).toBeGreaterThanOrEqual(8);

  const traceIds = new Set(toolSpans.map((span) => span.traceId));
  expect(traceIds.size).toBe(1);
  expect([...traceIds][0]).toBe(remediation.traceId);

  const applySpan = toolSpans.find((span) => span.name === "agentfence.tool.apply_fix");
  expect(applySpan?.attributes?.["agentfence.policy.decision"]).toBe("approval_required");
  expect(applySpan?.attributes?.["agentfence.tool.risk"]).toBe("CRITICAL");
  expect(applySpan?.attributes?.["agentfence.provenance.trust"]).toBe("TAINTED");
  expect(applySpan?.attributes?.["agentfence.provenance.tainted"]).toBe(true);
  expect(applySpan?.attributes?.["agentfence.result.status"]).toBe("PENDING_HUMAN_APPROVAL");

  const forbiddenTelemetryKeys = ["content", "prompt", "body", "patch", "raw", "output"];
  for (const span of telemetry) {
    for (const key of Object.keys(span.attributes || {})) {
      expect(forbiddenTelemetryKeys).not.toContain(key.toLowerCase());
    }
  }

  expect(toolSpans.every((span) => span.attributes?.["agentfence.provenance.chain_id"])).toBe(true);
  const hopCounts = toolSpans.map((span) => span.attributes?.["agentfence.provenance.hop_count"]).filter((value) => typeof value === "number");
  expect(Math.max(...hopCounts)).toBeGreaterThanOrEqual(2);
});
