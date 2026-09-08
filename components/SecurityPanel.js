"use client";

import { useAgentFence } from "./AgentFenceProvider";

export default function SecurityPanel() {
  const { pendingApproval, approvePending, denyPending, repo, patch, provenance, diffAnalysis, dataflowAnalysis } = useAgentFence();

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Policy engine</p>
      <h2 className="mt-1 text-lg font-semibold">AgentFence control plane</h2>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="READ" value="8" />
        <Metric label="WRITE" value="1" />
        <Metric label="STATE" value={repo.status === "fixed" ? "FIXED" : "RISK"} />
      </div>

      <div className="mt-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-fuchsia-200">Context trust</span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${provenance.trust === "TRUSTED" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
            {provenance.trust}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">AgentFence tracks whether the action path has been influenced by content returned from an untrusted source.</p>
        <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] font-mono">
          <span className="rounded bg-slate-900 px-2 py-1 text-slate-400">repository</span>
          {provenance.path.map((step, index) => (
            <span key={`${step}-${index}`} className="flex items-center gap-1">
              <span className="text-slate-700">→</span>
              <span className="rounded bg-red-400/10 px-2 py-1 text-red-200">{step}</span>
            </span>
          ))}
        </div>
        {provenance.sources.length > 0 && <div className="mt-2 text-[10px] text-slate-500">Source: <span className="font-mono text-slate-300">{provenance.sources.join(", ")}</span></div>}
      </div>

      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-300">Agent trap detected</span>
          <span className="text-[10px] font-bold text-red-300">UNTRUSTED DATA</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          <span className="font-mono text-slate-300">src/notes.txt</span> contains instructions attempting to override operator confirmation. Those instructions are data, not policy — but their presence taints the action path.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Policy decision</span>
          <span className="text-[10px] font-bold text-amber-300">PROVENANCE-AWARE</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Read-only investigation can continue. A consequential action influenced by untrusted context is escalated to human approval with elevated risk.
        </p>
      </div>

      {diffAnalysis && (
        <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-sky-200">Independent patch analysis</span>
            <span className={`text-[10px] font-bold ${diffAnalysis.passed ? "text-emerald-300" : "text-amber-300"}`}>{diffAnalysis.verdict}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">This check is deterministic and independent of the agent's explanation.</p>
          <div className="mt-3 space-y-1.5">
            {diffAnalysis.checks.map((check) => (
              <div key={check.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/60 px-2 py-1.5 text-[10px]">
                <span className="text-slate-400">{check.label}</span>
                <span className={check.pass ? "text-emerald-300" : "text-amber-300"}>{check.pass ? "✓ PASS" : "! REVIEW"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dataflowAnalysis && (
        <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-violet-200">Silver-One dataflow</span>
            <span className={`text-[10px] font-bold ${dataflowAnalysis.rejected ? "text-red-300" : "text-emerald-300"}`}>{dataflowAnalysis.verdict}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Deterministic source → sink reachability, evaluated against the Silver-One FlowGraphSnapshot contract.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-lg bg-slate-950/60 p-2"><div className="text-slate-500">Source</div><div className="mt-1 font-mono text-violet-200">UNTRUSTED_INPUT</div></div>
            <div className="rounded-lg bg-slate-950/60 p-2"><div className="text-slate-500">Sink</div><div className="mt-1 font-mono text-violet-200">MEMORY_WRITE</div></div>
            <div className="rounded-lg bg-slate-950/60 p-2"><div className="text-slate-500">Risk score</div><div className="mt-1 font-mono text-slate-200">{dataflowAnalysis.riskScore}</div></div>
            <div className="rounded-lg bg-slate-950/60 p-2"><div className="text-slate-500">Corpus</div><div className="mt-1 font-mono text-slate-300">cve-decision-seeds</div></div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-800 bg-black/20 p-2 text-[10px] leading-4 text-slate-500">
            <span className="text-slate-400">Fixture:</span> {dataflowAnalysis.fixture?.id} · <span className="text-slate-400">Evaluator:</span> graph_dataflow.py
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">{dataflowAnalysis.summary}</p>
        </div>
      )}

      {pendingApproval ? (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-amber-300">Approval required</span>
            <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300">{pendingApproval.risk} RISK</span>
          </div>

          <h3 className="mt-3 font-mono text-sm">{pendingApproval.tool}</h3>
          <p className="mt-2 text-xs text-slate-400">{pendingApproval.reason}</p>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
            <div><span className="text-slate-500">Finding:</span> {pendingApproval.findingId}</div>
            <div><span className="text-slate-500">Patch:</span> {pendingApproval.patchId}</div>
            <div><span className="text-slate-500">Context:</span> <span className="text-red-300">{pendingApproval.provenance?.trust}</span></div>
            <div><span className="text-slate-500">Gate:</span> <span className="text-amber-300">{pendingApproval.independentAnalysis?.verdict || "REVIEW"}</span></div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Agent recommendation vs. independent view</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg bg-slate-900 p-2"><div className="text-slate-500">Agent</div><div className="mt-1 text-amber-200">REQUESTED APPLY</div></div>
              <div className="rounded-lg bg-slate-900 p-2"><div className="text-slate-500">AgentFence</div><div className="mt-1 text-red-200">TAINTED + HUMAN GATE</div></div>
            </div>
          </div>

          <pre className="scrollbar mt-3 max-h-44 overflow-auto rounded-xl border border-slate-800 bg-black/30 p-3 text-[10px] leading-5 text-slate-400">
            {patch.diff}
          </pre>

          <div className="mt-3 flex gap-2">
            <button onClick={denyPending} className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">Deny</button>
            <button onClick={approvePending} className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">Approve</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">No pending consequential action.</div>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
