# AgentFence

**The security boundary between AI agents and the web.**

AgentFence is a WebMCP-powered security workspace that exposes structured repository tools to WebMCP-aware agents while applying a policy decision to every tool call.

Read-only investigation can proceed automatically. Consequential actions are intercepted by AgentFence and require explicit human approval.

> **The agent can decide what it wants to do. AgentFence decides whether the application will let it.**

## Why AgentFence?

WebMCP gives agents structured, discoverable capabilities. AgentFence explores the security layer that should sit around those capabilities when the information an agent consumes is not trustworthy.

The demo deliberately places an instruction-injection trap in `src/notes.txt`. The text attempts to convince an agent to bypass operator confirmation. AgentFence treats it as data, tracks its provenance, and changes the authorization decision when that context reaches a consequential action.

AgentFence does **not** claim that WebMCP itself prevents prompt injection. The application-level control is the point: **untrusted content is not authorization**.

## MVP 6 security flow

The primary demo path is an explicit WebMCP tool chain. The Silver-One dataflow analysis is intentionally visible as its own capability call rather than being hidden inside repository scanning:

```text
get_repository
      ↓
scan_repository
      ↓
ANALYZE_DATAFLOW  ← Silver-One evidence boundary
      ↓
inspect_finding
      ↓
propose_fix
      ↓
simulate_fix
      ↓
apply_fix
      ↓
HUMAN APPROVAL
      ↓
run_verification
```

The UI highlights this sequence in the **Live WebMCP execution path** panel. `analyze_dataflow` produces deterministic source-to-sink evidence before remediation is proposed.

The complete security story is:

`Agent → untrusted repository content → WebMCP scan → Silver-One dataflow evidence → provenance-aware policy → remediation proposal → independent patch analysis → human decision → verification → receipt`

## Provenance-aware policy

AgentFence uses a deliberately lightweight application-level trust model:

- `TRUSTED` — no untrusted source has influenced the current action path.
- `UNTRUSTED` — a tool returned content from an explicitly untrusted source.
- `TAINTED` — a later planning or simulation step inherited that provenance.

When `apply_fix` is requested with untrusted or tainted provenance, the policy engine elevates the action to `CRITICAL` risk and requires human approval.

This is **not** presented as full semantic taint analysis. MVP 6 adds a separate deterministic C dataflow evidence layer inspired by Silver-One's graph contract.

## Silver-One dataflow evidence

AgentFence reuses a narrow part of the Silver-One research implementation: the graph evidence model and deterministic reachability semantics.

The browser-safe adapter in `lib/silverOneDataflow.js` models:

`UNTRUSTED_INPUT → MEMORY_WRITE`

using a concrete C `memcpy` security fixture. It preserves the important evidence concepts:

- `FlowGraphSnapshot`
- `FlowSignature`
- source/sink endpoints
- supported sink categories
- sink-specific sanitizer proof
- fail-closed evaluation
- deterministic risk scoring

The application exposes that analysis directly as the WebMCP tool **`analyze_dataflow`**. This means a WebMCP-aware agent can discover and invoke the evidence capability through the same `document.modelContext` surface as the repository tools.

The full Silver-One GEPA/Pareto/reflection stack is **not** embedded in the browser application. The upstream project and CVE seed corpus remain external and are documented in `SILVER_ONE_INTEGRATION.md`.

## Independent patch analysis

AgentFence does not make the operator rely solely on the agent's explanation of its own patch.

Before approval, a deterministic analyzer independently checks:

- intended target file
- expected remediation logic
- new network-related calls
- secret/environment access
- permission-related changes
- change scope

The approval panel compares the signals:

`Agent: REQUESTED APPLY`

`AgentFence: TAINTED + HUMAN GATE`

`Independent check: PASS` (or `REVIEW` when a check fails)

The result is a second, deterministic signal rather than another copy of the agent's reasoning.

## WebMCP tools

### Investigation / evidence

- `get_repository`
- `get_commit_diff`
- `scan_repository`
- `analyze_dataflow` — explicit Silver-One-style C source-to-sink evidence step
- `inspect_finding`
- `run_verification`

### Planning

- `propose_fix`
- `simulate_fix`

### Consequential

- `apply_fix` — the protected write operation.

**9 tools are registered:** 8 read/evidence/planning capabilities and 1 consequential write capability.

The application uses the native WebMCP imperative API:

`document.modelContext.registerTool(...)`

The browser-side test harness demonstrates actual discovery and execution with:

`document.modelContext.getTools()`

`document.modelContext.executeTool(...)`

## Architecture

```text
                  WebMCP-aware Agent
                           │
                           ▼
                    AgentFence Web App
                           │
                  ┌────────┴─────────┐
                  ▼                  ▼
             Tool Registry     Provenance Tracker
                  │                  │
                  └────────┬─────────┘
                           ▼
                    Policy Engine
                           │
              ┌────────────┴────────────┐
              │                         │
       read/evidence               consequential
              │                         │
              ▼                         ▼
   Silver-One Dataflow          Human Approval Gate
   + deterministic checks              │
                                       ▼
                                Application Mutation
                                       │
                                       ▼
                                  Verification
                                       │
                                       ▼
                                Security Receipt
```

WebMCP provides the capability surface. AgentFence provides the application-level security boundary around consequential capabilities.

## Deliberately simulated environment

The repository shown in AgentFence is an **in-app security lab**. It is intentionally deterministic so the security boundary can be demonstrated reliably.

It is not a real Git repository and does not mutate external systems.

The vulnerable scenario uses `src/payments.js`, where an unvalidated payment amount is passed to `account.charge`. The remediation adds finite-positive-number validation.

## WebMCP lifecycle

The WebMCP registry is mounted once per page-provider lifecycle. Tool callbacks read current repository and provenance state through refs, so ordinary React state changes do not repeatedly register the same tool names.

Registration is owned by an `AbortController` and cleanup aborts that controller. This avoids WebMCP duplicate-tool-name failures during React lifecycle updates.

## Demo controls

### Run WebMCP agent path

Exercises actual browser-side WebMCP discovery/execution and visibly walks through:

`get_repository → scan_repository → analyze_dataflow → inspect_finding → propose_fix → simulate_fix → apply_fix`

The run intentionally stops at `apply_fix` until the human decides.

### Full Remediation

Runs the deterministic end-to-end application flow through the same registered tools.

### Simulate Attack

Resets the lab, reads the malicious repository note, models the agent attempting the consequential action, and demonstrates the provenance-aware gate.

### Approval

The human can approve or deny the exact patch. Approval is intentionally not exposed as an agent tool.

## Security principle

AgentFence separates three things:

### Agent intent

What the agent is attempting to do.

### Untrusted content

Information encountered while investigating the repository or web application.

### Application authorization

What the application actually permits the agent to execute.

> **Agent intent is not application authorization.**

MVP 6 adds another useful distinction:

> **Security evidence should be independently derived from the artifact being acted on, not only from the agent's explanation of it.**

## Verification and receipt

After an approved remediation, deterministic verification can produce:

- Repository: `FIXED`
- Verification: `PASS`
- Tests: `12 passed / 0 failed`

The security receipt records the finding, patch, policy/approval decision, verification result, tests, commit, and timestamp.

## Hackathon checklist

- [x] Native `document.modelContext.registerTool(...)`
- [x] Structured WebMCP schemas
- [x] WebMCP discovery and execution harness
- [x] Explicit `analyze_dataflow` WebMCP step in the primary agent path
- [x] Silver-One-style deterministic C dataflow evidence
- [x] Consequential action protected by human approval
- [x] Deliberate instruction-injection scenario
- [x] Independent patch analysis

## Post-submission observability line

This repository is the post-submission AgentFence development line. The original hackathon artifact remains frozen.

AgentFence now includes an OpenTelemetry tracing layer for the security lifecycle. Manual spans cover the WebMCP agent run, tool evaluations, human approval, and verification. The UI includes a local trace inspector, while an optional OTLP HTTP exporter can forward traces to an OpenTelemetry Collector.

The observability layer deliberately records authorization evidence rather than raw untrusted content. In particular, repository text, prompts, secrets, and patch bodies are not emitted as telemetry attributes by default.

See [`OTEL.md`](./OTEL.md) for configuration and [`AGENTFENCE_2_PLAN.md`](./AGENTFENCE_2_PLAN.md) for the post-submission roadmap.
