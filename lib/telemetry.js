"use client";

import { context, trace, SpanStatusCode } from "@opentelemetry/api";
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor, WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const SERVICE_NAME = "agentfence-web";
const tracer = { value: null };
const listeners = new Set();
const spans = [];
let initialized = false;

class AgentFenceSpanExporter {
  export(exportedSpans, resultCallback) {
    for (const span of exportedSpans) {
      const record = {
        name: span.name,
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        parentSpanId: span.parentSpanId,
        startTime: span.startTime,
        endTime: span.endTime,
        durationMs: Math.max(0, (span.endTime[0] - span.startTime[0]) * 1000 + (span.endTime[1] - span.startTime[1]) / 1e6),
        status: span.status?.code === SpanStatusCode.ERROR ? "ERROR" : "OK",
        attributes: { ...(span.attributes || {}) },
      };
      spans.unshift(record);
      if (spans.length > 100) spans.pop();
    }
    listeners.forEach((listener) => listener([...spans]));
    resultCallback({ code: 0 });
  }

  async shutdown() {}
  async forceFlush() {}
}

export function initTelemetry() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const spanProcessors = [
    new SimpleSpanProcessor(new AgentFenceSpanExporter()),
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
  ];

  const otlpEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (otlpEndpoint) {
    spanProcessors.push(
      new BatchSpanProcessor(new OTLPTraceExporter({ url: otlpEndpoint }), {
        maxQueueSize: 100,
        maxExportBatchSize: 20,
        scheduledDelayMillis: 1000,
        exportTimeoutMillis: 5000,
      })
    );
  }

  const provider = new WebTracerProvider({ spanProcessors });

  provider.register();
  tracer.value = trace.getTracer(SERVICE_NAME, "0.1.0");
}

export function getTracer() {
  initTelemetry();
  return tracer.value;
}

export function subscribeTelemetry(listener) {
  listeners.add(listener);
  listener([...spans]);
  return () => listeners.delete(listener);
}

export function getTelemetrySpans() {
  return [...spans];
}

export function clearTelemetrySpans() {
  spans.length = 0;
  listeners.forEach((listener) => listener([]));
}

export function startSpan(name, attributes = {}, parentSpan = null) {
  const currentTracer = getTracer();
  const options = { attributes: { "service.name": SERVICE_NAME, ...attributes } };
  const parentContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();
  return currentTracer.startSpan(name, options, parentContext);
}

export function finishSpan(span, status = SpanStatusCode.OK, attributes = {}) {
  if (!span) return;
  span.setAttributes(attributes);
  span.setStatus({ code: status });
  span.end();
}
