"use client";

import { useAgentFence } from "./AgentFenceProvider";

export default function ToolRegistry() {
  const { toolDefinitions, webmcpStatus } = useAgentFence();

  const status = {
    checking: ["CHECKING", "text-slate-300"],
    registered: [`${toolDefinitions.length} TOOLS REGISTERED`, "text-emerald-300"],
    unavailable: ["WEBMCP UNAVAILABLE", "text-amber-300"],
    error: ["REGISTRATION ERROR", "text-red-300"],
  }[webmcpStatus];

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">WebMCP tool registry</h2>
          <p className="text-xs text-slate-500">Native browser capability surface</p>
        </div>
        <span className={`rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold ${status?.[1]}`}>
          {status?.[0]}
        </span>
      </div>

      <div className="space-y-2">
        {toolDefinitions.map((tool) => {
          const write = tool.name === "apply_fix";
          const evidence = tool.name === "analyze_dataflow";
          return (
            <div key={tool.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <div>
                <div className="text-sm font-medium">{tool.name}</div>
                <div className="text-[11px] text-slate-500">{tool.title}</div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${write ? "bg-red-500/10 text-red-300" : evidence ? "bg-violet-500/10 text-violet-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                {write ? "WRITE" : evidence ? "EVIDENCE" : "READ"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
