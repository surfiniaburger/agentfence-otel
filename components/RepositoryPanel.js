"use client";

import { useAgentFence } from "./AgentFenceProvider";

export default function RepositoryPanel() {
  const { repo, finding } = useAgentFence();

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Repository</p>
          <h2 className="mt-1 text-lg font-semibold">{repo.name}</h2>
          <p className="text-xs text-slate-500">{repo.branch} · {repo.commit}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${repo.status === "fixed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {repo.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2">
        {Object.entries(repo.files).map(([path, content]) => (
          <details key={path} className="rounded-xl border border-slate-800 bg-slate-900/50">
            <summary className="cursor-pointer px-3 py-2 text-sm text-slate-300">{path}</summary>
            <pre className="scrollbar max-h-48 overflow-auto border-t border-slate-800 p-3 text-[11px] leading-5 text-slate-500">{content}</pre>
          </details>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
        <div className="flex items-center gap-2">
          <span className="text-red-300">●</span>
          <span className="text-sm font-semibold text-red-200">{finding.severity} · {finding.title}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">{finding.evidence}</p>
      </div>
    </section>
  );
}
