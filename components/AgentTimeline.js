"use client";

import { useAgentFence } from "./AgentFenceProvider";

export default function AgentTimeline() {
  const { timeline, runAgentDemo, simulatePromptInjection, receipt } = useAgentFence();

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Agent activity</p>
          <h2 className="mt-1 text-lg font-semibold">Tool execution timeline</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runAgentDemo}
            className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-400/20"
          >
            Full Remediation
          </button>
          <button
            onClick={simulatePromptInjection}
            className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-400/20"
          >
            Simulate Attack
          </button>
        </div>
      </div>

      <div className="scrollbar max-h-[430px] space-y-2 overflow-auto">
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            Waiting for an agent tool call.
          </div>
        ) : timeline.map((event) => (
          <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-300">{event.tool}</span>
              <span className={`text-[10px] font-bold uppercase ${
                event.status === "approved" || event.status === "executed" || event.status === "allowed" || event.status === "passed"
                  ? "text-emerald-300"
                  : event.status === "waiting" || event.status === "approval_required"
                    ? "text-amber-300"
                    : "text-red-300"
              }`}>
                {event.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{event.time} · {event.detail}</p>
          </div>
        ))}
      </div>

      {receipt && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Security receipt</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Receipt</span><br />{receipt.id}</div>
            <div><span className="text-slate-500">Verification</span><br />{receipt.verification}</div>
            <div><span className="text-slate-500">Patch</span><br />{receipt.patchId}</div>
            <div><span className="text-slate-500">Tests</span><br />{receipt.tests.passed} passed</div>
          </div>
        </div>
      )}
    </section>
  );
}
