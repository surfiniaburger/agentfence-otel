// Silver-One compatibility layer for AgentFence.
//
// The production Silver-One implementation uses Tree-sitter C extraction to
// build FlowGraphSnapshot records and graph_dataflow.py to evaluate them.
// AgentFence keeps the browser deployment dependency-free by evaluating the
// same snapshot contract and fail-closed reachability rules in JavaScript.

export const SUPPORTED_SINKS = new Set(["MEMORY_WRITE", "POINTER_DEREF", "ARRAY_INDEX", "SYSTEM_CALL"]);
export const VALID_SANITIZERS = new Set(["BOUNDS_CHECK", "RANGE_VALIDATION", "NULL_CHECK", "COMMAND_SANITIZATION", "ALLOWLIST_CHECK"]);

export const SILVER_ONE_METADATA = {
  repository: "surfiniaburger/silver-one",
  graphExtractor: "scenarios/debate/graphify_flow_extractor.py",
  reachabilityEvaluator: "scenarios/debate/graph_dataflow.py",
  corpus: "surfiniaburger/cve-decision-seeds",
  corpusFile: "cve_seeds_500_clean.jsonl",
  contract: "FlowGraphSnapshot / FlowSignature",
};

// Concrete C fixture from Silver-One's graph extractor tests. The deployed
// demo uses this as a deterministic security-analysis fixture; the full CVE
// seed corpus remains external and is not bundled into the web app.
export const SILVER_ONE_C_FIXTURE = {
  id: "silver-one-fixture-memcpy",
  language: "c",
  source: `void vuln(const char *user_input, size_t len) {\n  char buffer[64];\n  memcpy(buffer, user_input, len);\n}`,
  predicate: "buffer overflow in memory write",
  sourceType: "UNTRUSTED_INPUT",
  sinkType: "MEMORY_WRITE",
};

export const SILVER_ONE_GRAPH = {
  vulnerable: {
    snapshot_id: "af-silver-one-vuln-v1",
    scenario_id: "silver-one-fixture-memcpy",
    version: 1,
    created_at: 1,
    nodes: {
      src_user_input: { id: "src_user_input", kind: "source", label: "Source(user_input)", type: "UNTRUSTED_INPUT", target_var: "user_input", source_kind: "function_parameter", lineno: 1 },
      sink_memcpy_1: { id: "sink_memcpy_1", kind: "sink", type: "MEMORY_WRITE", target_var: "buffer", label: "Call(memcpy)", lineno: 3 },
    },
    signatures: [{ source_id: "src_user_input", sink_id: "sink_memcpy_1", source_type: "UNTRUSTED_INPUT", sink_type: "MEMORY_WRITE", flow_type: "CALL_ARGUMENT", sanitizer_type: null, guarded_target: null, invalid_at: null }],
    is_complete: true,
    parse_error: null,
  },
  fixed: {
    snapshot_id: "af-silver-one-fixed-v1",
    scenario_id: "silver-one-fixture-memcpy",
    version: 2,
    created_at: 1,
    nodes: {
      src_user_input: { id: "src_user_input", kind: "source", label: "Source(user_input)", type: "UNTRUSTED_INPUT", target_var: "user_input", source_kind: "function_parameter", lineno: 1 },
      sink_memcpy_1: { id: "sink_memcpy_1", kind: "sink", type: "MEMORY_WRITE", target_var: "buffer", label: "Call(memcpy)", lineno: 4 },
    },
    signatures: [{ source_id: "src_user_input", sink_id: "sink_memcpy_1", source_type: "UNTRUSTED_INPUT", sink_type: "MEMORY_WRITE", flow_type: "CALL_ARGUMENT", sanitizer_type: "BOUNDS_CHECK", guarded_target: "buffer", invalid_at: null }],
    is_complete: true,
    parse_error: null,
  },
};

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizerValidForSink(sinkType, sanitizerType) {
  if (!sanitizerType || !VALID_SANITIZERS.has(sanitizerType)) return false;
  if (sinkType === "MEMORY_WRITE" || sinkType === "ARRAY_INDEX") return sanitizerType === "BOUNDS_CHECK" || sanitizerType === "RANGE_VALIDATION";
  if (sinkType === "POINTER_DEREF") return sanitizerType === "NULL_CHECK";
  if (sinkType === "SYSTEM_CALL") return sanitizerType === "COMMAND_SANITIZATION" || sanitizerType === "ALLOWLIST_CHECK";
  return false;
}

export function evaluateSilverOneReachability(snapshot, asOf = null) {
  if (!snapshot?.is_complete || snapshot?.parse_error != null) return 1.0;
  if (!finiteNumber(snapshot.created_at)) return 1.0;
  if (asOf !== null && !finiteNumber(asOf)) return 1.0;

  const evalTime = asOf === null ? snapshot.created_at : asOf;
  const signatures = snapshot.signatures || [];
  if (signatures.length > 0 && !snapshot.nodes) return 1.0;
  const active = [];

  for (const sig of signatures) {
    if (!SUPPORTED_SINKS.has(sig.sink_type)) return 1.0;
    if (!snapshot.nodes?.[sig.source_id] || !snapshot.nodes?.[sig.sink_id]) return 1.0;
    if (sig.invalid_at !== null && sig.invalid_at !== undefined) {
      if (!finiteNumber(sig.invalid_at)) return 1.0;
      if (!(sig.invalid_at > evalTime)) continue;
    }
    active.push(sig);
  }

  if (!active.length) return 1.0;

  for (const sig of active) {
    if (sig.source_type !== "UNTRUSTED_INPUT") continue;
    const sink = snapshot.nodes[sig.sink_id] || {};
    const validProof = sanitizerValidForSink(sig.sink_type, sig.sanitizer_type)
      && Boolean(sig.guarded_target)
      && Boolean(sink.target_var)
      && sig.guarded_target === sink.target_var;
    if (!validProof) return 1.0;
  }

  return 0.05;
}

export function analyzeWithSilverOne({ stage = "vulnerable", provenance }) {
  const snapshot = stage === "fixed" ? SILVER_ONE_GRAPH.fixed : SILVER_ONE_GRAPH.vulnerable;
  const riskScore = evaluateSilverOneReachability(snapshot);
  const rejected = riskScore >= 0.10;
  const tainted = provenance?.trust === "TAINTED" || provenance?.trust === "UNTRUSTED";

  return {
    engine: "Silver-One dataflow reachability",
    implementation: SILVER_ONE_METADATA,
    fixture: SILVER_ONE_C_FIXTURE,
    snapshot,
    riskScore,
    verdict: rejected ? "HIGH RISK" : "LOW RISK",
    rejected,
    provenanceAware: tainted,
    summary: rejected
      ? "Silver-One graph semantics found an active UNTRUSTED_INPUT → MEMORY_WRITE path without a valid sanitizer proof."
      : "Silver-One graph semantics found the sink guarded by a sanitizer valid for the sink type.",
  };
}
