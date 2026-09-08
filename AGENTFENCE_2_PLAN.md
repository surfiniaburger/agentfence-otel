# AgentFence 2 — Observable Authorization Runtime

The hackathon submission remains frozen. This repository is the post-submission development line.

## Thesis

WebMCP exposes capabilities. AgentFence governs authorization. OpenTelemetry makes the authorization lifecycle observable and auditable.

## Current lifecycle

```text
WebMCP discovery
      ↓
Tool execution
      ↓
Security evidence
      ↓
Provenance
      ↓
Policy evaluation
      ↓
Human approval
      ↓
Mutation
      ↓
Verification
      ↓
Security receipt
      ↓
OpenTelemetry trace
```

## Invariants

1. Unknown tools are denied by default.
2. Untrusted provenance plus a consequential action requires human approval.
3. Independent patch analysis failure prohibits mutation.
4. High-risk dataflow evidence is visible before remediation.
5. Verification failure cannot produce a PASS receipt.
6. Telemetry must not contain raw repository content, prompts, secrets, or patch bodies by default.

## Next milestones

### M1 — OTEL foundation
- [x] Browser OpenTelemetry SDK
- [x] Manual security spans
- [x] AgentFence-specific security attributes
- [x] Local trace inspector
- [x] Consequential WebMCP annotation on `apply_fix`

### M2 — Collector export
- [ ] OTLP HTTP exporter
- [ ] Local OpenTelemetry Collector configuration
- [ ] Trace backend / Jaeger or equivalent
- [ ] Collector health indicator

### M3 — Trace-backed receipts
- [ ] Add trace ID to security receipts
- [ ] Correlate policy decision, approval, mutation, and verification
- [ ] Export receipt metadata without sensitive payloads

### M4 — Policy observability
- [ ] Metrics for allow / deny / approval decisions
- [ ] Tool latency and failure metrics
- [ ] Provenance-taint counters
- [ ] Verification outcome metrics

### M5 — Production authorization runtime
- [ ] Real repository adapters
- [ ] CI/CD policy integration
- [ ] Durable approval records
- [ ] Policy versioning
- [ ] Agent identity and environment-aware authorization
