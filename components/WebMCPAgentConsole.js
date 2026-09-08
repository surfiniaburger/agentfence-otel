"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgentFence } from "./AgentFenceProvider";
import { finishSpan, startSpan } from "../lib/telemetry";

function parseResult(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

export default function WebMCPAgentConsole() {
  const { pendingApproval, repo } = useAgentFence();
  const [nativeTools, setNativeTools] = useState([]);
  const [status, setStatus] = useState("checking");
  const [running, setRunning] = useState(false);
  const [lastCall, setLastCall] = useState(null);
  const [agentMessage, setAgentMessage] = useState(
    "Audit this repository and fix the vulnerability."
  );
  const [activeStep, setActiveStep] = useState("idle");

  const refreshTools = useCallback(async () => {
    const modelContext = typeof document !== "undefined" ? document.modelContext : null;
    if (!modelContext?.getTools) {
      setNativeTools([]);
      setStatus("unavailable");
      return [];
    }

    try {
      const tools = await modelContext.getTools();
      setNativeTools(tools || []);
      setStatus("ready");
      return tools || [];
    } catch (error) {
      console.error(error);
      setStatus("error");
      return [];
    }
  }, []);

  useEffect(() => {
    refreshTools();

    const modelContext = typeof document !== "undefined" ? document.modelContext : null;
    if (!modelContext?.addEventListener) return undefined;

    const onToolChange = () => refreshTools();
    modelContext.addEventListener("toolchange", onToolChange);
    return () => modelContext.removeEventListener("toolchange", onToolChange);
  }, [refreshTools]);

  const invoke = useCallback(async (name, input = {}) => {
    const modelContext = typeof document !== "undefined" ? document.modelContext : null;
    if (!modelContext?.executeTool) {
      throw new Error("WebMCP executeTool is unavailable in this browser.");
    }

    const tools = nativeTools.length ? nativeTools : await refreshTools();
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`WebMCP tool not found: ${name}`);

    const startedAt = performance.now();
    const rawResult = await modelContext.executeTool(tool, JSON.stringify(input));
    const result = parseResult(rawResult);
    const call = {
      name,
      input,
      result,
      duration: Math.round(performance.now() - startedAt),
      at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setLastCall(call);
    return result;
  }, [nativeTools, refreshTools]);

  const runAgentPath = useCallback(async () => {
    setRunning(true);
    setLastCall(null);
    const traceSpan = startSpan("agentfence.webmcp.agent_run", {
      "agentfence.run.kind": "browser_webmcp_harness",
      "agentfence.run.goal": "repository remediation",
    });
    let runResult = "COMPLETED_OR_STOPPED";

    try {
      // This is a genuine WebMCP execution harness: every step goes through
      // document.modelContext.executeTool(), the same capability surface an
      // external WebMCP-aware agent discovers.
      setActiveStep("repository");
      const repoResult = await invoke("get_repository");
      if (!repoResult?.ok) return;

      setActiveStep("scan");
      const scan = await invoke("scan_repository", { severity: "high" });
      const target = scan?.findings?.[0];
      if (!target) return;

      // Silver-One evidence is an explicit WebMCP step in the agent path.
      // Keeping this as its own tool call makes the security evidence visible
      // rather than hiding the analysis inside scan_repository.
      setActiveStep("dataflow");
      const dataflow = await invoke("analyze_dataflow");
      if (!dataflow?.ok) return;

      setActiveStep("inspect");
      await invoke("inspect_finding", { findingId: target.id });
      setActiveStep("propose");
      await invoke("propose_fix", { findingId: target.id });
      setActiveStep("simulate");
      await invoke("simulate_fix", { patchId: "P-001" });

      // This intentionally reaches the consequential boundary. AgentFence
      setActiveStep("approval");
      // must return PENDING_HUMAN_APPROVAL instead of mutating the repository.
      const applyResult = await invoke("apply_fix", { findingId: target.id, patchId: "P-001" });
      runResult = applyResult?.status === "PENDING_HUMAN_APPROVAL" ? "PENDING_APPROVAL" : "COMPLETED";
    } catch (error) {
      finishSpan(traceSpan, 2, { "agentfence.run.result": "ERROR", "agentfence.run.error": error.message });
      setActiveStep("error");
      setLastCall({
        name: "WEBMCP_HARNESS",
        input: {},
        result: { ok: false, error: error.message },
        duration: 0,
        at: new Date().toLocaleTimeString(),
      });
    } finally {
      if (traceSpan) finishSpan(traceSpan, 1, { "agentfence.run.result": runResult });
      setRunning(false);
      refreshTools();
    }
  }, [invoke, refreshTools, pendingApproval]);

  const verify = useCallback(async () => {
    setRunning(true);
    try {
      await invoke("run_verification");
    } catch (error) {
      setLastCall({
        name: "WEBMCP_HARNESS",
        input: {},
        result: { ok: false, error: error.message },
        duration: 0,
        at: new Date().toLocaleTimeString(),
      });
    } finally {
      setRunning(false);
    }
  }, [invoke]);

  const writeTool = useMemo(
    () => nativeTools.find((tool) => tool.name === "apply_fix"),
    [nativeTools]
  );

  return (
    <section className="mb-5 rounded-2xl border border-violet-400/25 bg-violet-400/[0.04] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${status === "ready" ? "bg-emerald-400" : status === "checking" ? "bg-amber-400" : "bg-red-400"}`} />
            <p className="text-xs uppercase tracking-[0.2em] text-violet-300">WebMCP agent layer</p>
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {status === "ready" ? `${nativeTools.length} DISCOVERED` : status.toUpperCase()}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-semibold">Actual browser tool discovery & execution</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            This panel calls the native WebMCP discovery and execution APIs. It is a transparent test harness for the same tools a WebMCP-aware external agent can discover; the policy decision remains inside AgentFence.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={refreshTools}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            Refresh tools
          </button>
          <button
            onClick={runAgentPath}
            disabled={running || status !== "ready" || Boolean(pendingApproval)}
            className="rounded-xl border border-violet-400/40 bg-violet-400/10 px-4 py-2 text-xs font-bold text-violet-200 hover:bg-violet-400/20"
          >
            {running ? "Agent running…" : "Run WebMCP agent path"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Live WebMCP execution path</div>
            <div className="mt-1 text-[11px] text-slate-400">The Silver-One dataflow evidence call is an explicit capability between repository scanning and remediation planning.</div>
          </div>
          <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[9px] font-bold text-violet-200">9 TOOLS</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[["repository","get_repository"],["scan","scan_repository"],["dataflow","analyze_dataflow"],["inspect","inspect_finding"],["propose","propose_fix"],["simulate","simulate_fix"],["approval","apply_fix"]].map(([key, label], index, items) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`rounded-lg border px-2 py-1.5 font-mono text-[10px] ${activeStep === key ? "border-violet-400/60 bg-violet-400/15 text-violet-100" : activeStep === "approval" && key === "dataflow" ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300" : "border-slate-800 bg-slate-900/70 text-slate-500"}`}>
                {label}
              </span>
              {index < items.length - 1 && <span className="text-slate-700">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_1fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Agent intent</div>
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2 font-mono text-xs leading-5 text-slate-300">
            {agentMessage}
          </div>
          <input
            value={agentMessage}
            onChange={(event) => setAgentMessage(event.target.value)}
            aria-label="Agent task"
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-400 outline-none focus:border-violet-400/40"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Discovered capability</div>
            <span className="text-[10px] font-mono text-slate-600">document.modelContext.getTools()</span>
          </div>
          <div className="scrollbar mt-2 max-h-28 space-y-1 overflow-auto">
            {nativeTools.length ? nativeTools.map((tool) => (
              <div key={tool.name} className="flex items-center justify-between rounded-lg bg-slate-900/70 px-2 py-1.5">
                <span className="font-mono text-[11px] text-slate-300">{tool.name}</span>
                <span className={`text-[9px] font-bold ${tool.annotations?.readOnlyHint === false ? "text-red-300" : "text-emerald-300"}`}>
                  {tool.annotations?.readOnlyHint === false ? "WRITE" : "READ"}
                </span>
              </div>
            )) : <div className="text-xs text-slate-600">No native tools discovered.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Last WebMCP call</div>
            {lastCall && <span className="text-[10px] font-mono text-slate-600">{lastCall.duration}ms</span>}
          </div>
          {lastCall ? (
            <>
              <div className="mt-2 font-mono text-xs text-violet-200">{lastCall.name}</div>
              <pre className="scrollbar mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-slate-500">
                {JSON.stringify(lastCall.result, null, 2)}
              </pre>
            </>
          ) : (
            <div className="mt-3 text-xs text-slate-600">No WebMCP execution yet.</div>
          )}
        </div>
      </div>

      {pendingApproval && (
        <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
          <div className="text-xs font-bold text-amber-200">WebMCP execution stopped at AgentFence</div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span className="font-mono text-slate-300">{writeTool?.name || "apply_fix"}</span> returned PENDING_HUMAN_APPROVAL. Repository is still {repo.status}. Review the exact mutation in the control plane, then approve or deny it there.
          </div>
        </div>
      )}

      {!pendingApproval && repo.status === "fixed" && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
          <div className="text-xs text-emerald-200">Mutation approved and repository is fixed.</div>
          <button onClick={verify} disabled={running} className="rounded-lg border border-emerald-400/30 px-3 py-2 text-[11px] font-bold text-emerald-200">
            {running ? "Verifying…" : "Run verification via WebMCP"}
          </button>
        </div>
      )}
    </section>
  );
}
