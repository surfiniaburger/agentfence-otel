# Security model

AgentFence is a demonstration of defense-in-depth around agent-accessible web capabilities.

Repository contents are treated as untrusted data. Text returned from a repository should not be interpreted as policy instructions.

## Security boundary

The core boundary is:

**agent tool request → policy evaluation → human approval (when required) → state mutation → verification → receipt**

WebMCP exposes capabilities to an agent; AgentFence does not claim that WebMCP itself prevents prompt injection or malicious repository content.

## Independent evidence

MVP 6 adds an explicit `analyze_dataflow` WebMCP capability between `scan_repository` and `propose_fix`. It provides deterministic C source-to-sink evidence using a Silver-One-style `FlowGraphSnapshot` contract and fail-closed reachability evaluation.

This evidence step is intentionally separate from the agent's proposed remediation. The application can therefore compare:

1. what the agent wants to do,
2. what untrusted content influenced the action path, and
3. what the deterministic artifact analysis says.

## Scope

The browser adapter is a narrow integration of Silver-One's graph evidence concepts. It is not the complete Silver-One GEPA/Pareto/reflection system, and the demo does not claim full semantic taint analysis.
