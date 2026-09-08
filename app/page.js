"use client";

import { AgentFenceProvider } from "../components/AgentFenceProvider";
import ToolRegistry from "../components/ToolRegistry";
import RepositoryPanel from "../components/RepositoryPanel";
import AgentTimeline from "../components/AgentTimeline";
import SecurityPanel from "../components/SecurityPanel";
import WebMCPAgentConsole from "../components/WebMCPAgentConsole";
import TelemetryPanel from "../components/TelemetryPanel";

export default function Home() {
  return (
    <AgentFenceProvider>
      <main className="mx-auto min-h-screen max-w-[1500px] px-5 py-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-lg">
                ⛨
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">AgentFence</h1>
                <p className="text-sm text-slate-500">The security boundary between AI agents and the web.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Security posture</div>
            <div className="mt-1 text-sm font-bold text-emerald-300">HUMAN-IN-THE-LOOP</div>
          </div>
        </header>

        <div className="mb-5 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-sky-100">WebMCP capability surface</div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
                AgentFence exposes structured repository tools to a WebMCP-aware
                agent, then evaluates every call before execution. The
                consequential boundary is <span className="font-mono text-slate-300">apply_fix</span>.
              </p>
            </div>
            <div className="text-xs text-slate-500">WebMCP security control plane</div>
          </div>
        </div>

        <WebMCPAgentConsole />

        <TelemetryPanel />

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.25fr_0.9fr]">
          <div className="space-y-5">
            <RepositoryPanel />
            <ToolRegistry />
          </div>

          <AgentTimeline />

          <SecurityPanel />
        </div>

        <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-600">
          AgentFence is a demo security boundary. Repository contents are
          untrusted data; WebMCP provides the agent-facing capability surface,
          while policy and human approval govern consequential actions.
        </footer>
      </main>
    </AgentFenceProvider>
  );
}
