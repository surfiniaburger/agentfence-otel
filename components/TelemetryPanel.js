"use client";

import { useEffect, useState } from "react";
import { getTelemetrySpans, initTelemetry, subscribeTelemetry } from "../lib/telemetry";

function shortTrace(id = "") {
  return id ? `${id.slice(0, 8)}…${id.slice(-4)}` : "—";
}

export default function TelemetryPanel() {
  const [spans, setSpans] = useState([]);

  useEffect(() => {
    initTelemetry();
    setSpans(getTelemetrySpans());
    return subscribeTelemetry(setSpans);
  }, []);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">OpenTelemetry</div>
          <h2 className="mt-1 text-lg font-semibold">Agent execution trace</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Security operations are emitted as OpenTelemetry spans. Raw repository or prompt content is intentionally excluded from telemetry attributes.
          </p>
        </div>
        <div className="rounded-full border border-sky-400/25 bg-sky-400/5 px-3 py-1 text-[10px] font-bold text-sky-200">
          {spans.length} SPANS
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr] gap-2 bg-slate-900/80 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
          <span>Span</span><span>Trace</span><span>Result</span><span>Duration</span>
        </div>
        <div className="max-h-72 overflow-auto">
          {spans.length ? spans.map((span, index) => (
            <div key={`${span.spanId}-${index}`} className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr] gap-2 border-t border-slate-800/80 px-3 py-2 font-mono text-[10px]">
              <div className="truncate text-slate-300">{span.name}</div>
              <div className="text-slate-600">{shortTrace(span.traceId)}</div>
              <div className={span.status === "ERROR" ? "text-red-300" : "text-emerald-300"}>{span.status}</div>
              <div className="text-slate-500">{Math.round(span.durationMs)}ms</div>
            </div>
          )) : (
            <div className="px-3 py-6 text-center text-xs text-slate-600">Run the WebMCP agent path to generate a trace.</div>
          )}
        </div>
      </div>

      {spans[0] && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Latest span attributes</div>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-slate-500">
            {JSON.stringify(spans[0].attributes, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
