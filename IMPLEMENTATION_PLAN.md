# AgentFence MVP 6 — Implementation Notes

## Goal

Build a small but defensible WebMCP security control plane around consequential agent actions, with an explicit deterministic C dataflow evidence step derived from the Silver-One research work.

## Primary WebMCP execution path

The demo's browser-side WebMCP harness executes this sequence through `document.modelContext.executeTool(...)`:

1. `get_repository`
2. `scan_repository`
3. `analyze_dataflow`
4. `inspect_finding`
5. `propose_fix`
6. `simulate_fix`
7. `apply_fix`
8. human approval
9. `run_verification`

The important MVP 6 change is that `analyze_dataflow` is an **explicit tool call** between scanning and remediation planning. `scan_repository` no longer performs hidden dataflow analysis.

## Silver-One evidence layer

`lib/silverOneDataflow.js` is a browser-safe adapter inspired by:

- `surfiniaburger/silver-one/scenarios/debate/graphify_flow_extractor.py`
- `surfiniaburger/silver-one/scenarios/debate/graph_dataflow.py`
- `surfiniaburger/cve-decision-seeds`

The adapter preserves the useful graph evidence concepts without embedding the full Silver-One research stack in the Next.js client.

The demo fixture represents an untrusted C input reaching a `MEMORY_WRITE` sink through a `memcpy` pattern. The evaluator is deterministic and fails closed when graph evidence is incomplete or unsupported.

## Provenance model

`TRUSTED → UNTRUSTED → TAINTED`

- Repository content returned from `src/notes.txt` establishes an untrusted source.
- Planning/simulation operations propagate that provenance.
- `apply_fix` evaluates current provenance before mutation.
- Untrusted/tainted consequential actions are escalated to a critical human gate.

## Independent patch analysis

`lib/diffAnalysis.js` performs deterministic checks against the known demo patch:

- expected target file
- expected remediation tokens
- network-call indicators
- secret/environment access indicators
- permission-escalation indicators
- scope of modified files

## WebMCP lifecycle

The registry is registered once per provider lifecycle. Current repository/provenance state is accessed through refs. An `AbortController` handles cleanup so React updates do not repeatedly register duplicate tool names.

## UI requirements

The WebMCP console visibly renders the live path and highlights `analyze_dataflow` as the Silver-One evidence boundary. The control plane displays the resulting source, sink, risk score, corpus, fixture, and evaluator.

## Verification

Pure JavaScript contract tests cover the Silver-One-style evaluator. Full dependency installation/build may require a normal networked Node environment.
