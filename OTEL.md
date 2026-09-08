# AgentFence OpenTelemetry

AgentFence now treats observability as part of the authorization boundary.

## What is instrumented

The browser emits OpenTelemetry spans for:

- `agentfence.webmcp.agent_run` — the browser WebMCP harness execution.
- `agentfence.tool.<tool>` — every AgentFence tool evaluation/execution.
- `agentfence.human_approval` — explicit approve/deny decisions.

The current UI includes a local trace view so the complete lifecycle can be inspected without a collector.

## Security attributes

Application-specific `agentfence.*` attributes capture authorization evidence without copying raw repository or prompt content into telemetry.

Examples:

- `agentfence.policy.decision`
- `agentfence.policy.reason`
- `agentfence.provenance.trust`
- `agentfence.provenance.tainted`
- `agentfence.finding.id`
- `agentfence.patch.id`
- `agentfence.dataflow.verdict`
- `agentfence.dataflow.risk_score`
- `agentfence.approval.required`
- `agentfence.approval.decision`
- `agentfence.verification.status`

Raw untrusted content, prompts, secrets, and patch bodies are intentionally not telemetry attributes.

## OTLP export

The app can be extended to export the same spans to an OpenTelemetry Collector using the OTLP HTTP exporter. The browser exporter expects an endpoint ending in `/v1/traces`.

Recommended environment variable for a deployment:

```text
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://your-collector.example/v1/traces
```

For a production deployment, configure CORS and collector authentication separately. Never place private collector credentials in browser-exposed environment variables.

## Current implementation note

Browser instrumentation in OpenTelemetry JavaScript is still considered experimental. AgentFence therefore uses manual instrumentation for its security-critical spans rather than relying on automatic browser instrumentation.

The project currently uses `@opentelemetry/api` 1.9.1 and `@opentelemetry/sdk-trace-web` 2.11.0.
