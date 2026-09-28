# WebMCP / OTEL End-to-End Experiment

This experiment drives the application's actual browser WebMCP surface:
`document.modelContext.getTools()` -> `document.modelContext.executeTool()` -> AgentFence tool handler -> provenance/policy -> OTEL spans.

It is intentionally different from the V1-V5 robustness runners.

## What it proves
- WebMCP discovers the registered AgentFence tools from the real page.
- Execution enters `AgentFenceProvider.executeTool()`, not a synthetic provenance harness.
- Repository content marks the action context untrusted.
- Provenance remains TAINTED through remediation planning and simulation.
- `apply_fix` reaches the consequential boundary and returns `PENDING_HUMAN_APPROVAL`.
- The repository remains vulnerable because no mutation occurred.
- Tool spans share one OTEL trace.
- The consequential span records CRITICAL risk, approval_required, TAINTED provenance, and the approval-gate outcome.
- Telemetry is metadata-only; raw-content/prompt/body/patch/output attribute keys are rejected.

## Run locally
WebMCP is experimental and browser-gated. The test deliberately does not install a polyfill.

```bash
npm install
npx playwright install chromium
npm run test:e2e:webmcp
```

The test requires a browser build that exposes `document.modelContext` on localhost. If the API is absent, the test fails rather than falling back to a mock.

## Scope
The automated run intentionally stops before human approval, so it never mutates the repository. A future approved-mutation + verification lane should remain separate because it crosses the human authorization boundary.
