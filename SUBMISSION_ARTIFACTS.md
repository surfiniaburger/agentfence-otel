# Submission artifacts

## What is submitted

1. `agentfence-mvp/` — the deployable WebMCP application.
2. `lib/silverOneDataflow.js` — the narrow browser-safe Silver-One dataflow evidence adapter.
3. `SILVER_ONE_INTEGRATION.md` — upstream implementation, contract, corpus, and integration boundary.
4. `tests/silverOneDataflow.test.mjs` — deterministic evaluator contract tests.
5. `SECURITY.md` — security model and explicit evidence boundary.
6. `IMPLEMENTATION_PLAN.md` — implementation and verification notes.

## Primary demo evidence

The visible WebMCP path is:

`get_repository → scan_repository → analyze_dataflow → inspect_finding → propose_fix → simulate_fix → apply_fix`

`analyze_dataflow` is a real registered WebMCP tool. The browser harness discovers it through `document.modelContext.getTools()` and invokes it through `document.modelContext.executeTool(...)`.

The UI then surfaces the resulting Silver-One-style source/sink graph evidence before the remediation proposal and consequential-action gate.

## Upstream project

AgentFence references the public `surfiniaburger/silver-one` repository rather than vendoring its entire source tree. The upstream implementation contains the Tree-sitter C extractor and authoritative Python reachability evaluator. The CVE seed corpus is published separately as `surfiniaburger/cve-decision-seeds`.

The integration is deliberately narrow: AgentFence reuses the graph evidence contract and fail-closed reachability semantics, not the complete Silver-One GEPA/Pareto/reflection system.

## Submission positioning

The strongest claim is not that AgentFence is a replacement for Silver-One. It is that AgentFence turns deterministic security evidence into a **WebMCP-accessible control-plane capability** and places that evidence in the authorization path before a consequential agent action.
