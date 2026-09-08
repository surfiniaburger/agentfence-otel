# Silver-One integration

AgentFence MVP 6 reuses a narrow, defensible portion of `surfiniaburger/silver-one`: the graph-based C dataflow evidence model and deterministic reachability semantics.

## Upstream implementation

- Repository: `surfiniaburger/silver-one`
- C extractor: `scenarios/debate/graphify_flow_extractor.py`
- Reachability evaluator: `scenarios/debate/graph_dataflow.py`
- Data contract: `FlowGraphSnapshot` / `FlowSignature`
- Seed corpus: `surfiniaburger/cve-decision-seeds`
- Seed file: `cve_seeds_500_clean.jsonl`

Silver-One's graph layer models source-to-sink relationships and validates sink-specific sanitizer proofs. Its evaluator fails closed when graph evidence is incomplete or invalid.

## AgentFence integration boundary

The browser app does **not** execute the Silver-One Python runtime or download the complete 500-seed corpus at runtime. Instead, `lib/silverOneDataflow.js` is a small JavaScript adapter that preserves the graph evidence contract and evaluator behavior needed by the demo.

The adapter uses a concrete C `memcpy` fixture representative of the C dataflow tests in Silver-One. This makes the WebMCP demo deterministic and deployable while keeping the upstream research dependency explicit and auditable.

## Explicit WebMCP capability

MVP 6 exposes the adapter through the registered WebMCP tool:

`analyze_dataflow`

The primary execution path is:

```text
get_repository
    ↓
scan_repository
    ↓
analyze_dataflow   ← Silver-One evidence boundary
    ↓
inspect_finding
    ↓
propose_fix
```

The UI highlights this sequence so the judge can see that dataflow evidence is an actual capability call, not merely a label attached to the security panel.

## Why this boundary?

AgentFence is a Next.js browser application. Embedding the complete Python GEPA/Pareto/reflection system would introduce a large runtime and deployment dependency that is unnecessary for the WebMCP security demonstration.

The useful architectural reuse is therefore the **evidence contract and deterministic analysis philosophy**, not the entire research pipeline.

## Corpus relationship

Silver-One's seed workflow uses the published `surfiniaburger/cve-decision-seeds` corpus. AgentFence documents that relationship but does not silently claim that the browser demo dynamically evaluates all 500 seeds.

## Attribution / auditability

The AgentFence repository should link to the upstream Silver-One repository and the CVE seed dataset in submission materials. The adapter is clearly labeled as a Silver-One-style integration rather than an unmodified copy of the upstream Python implementation.
