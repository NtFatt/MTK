import { context, trace, type SpanAttributes } from "@opentelemetry/api";
import { env } from "../config/env.js";

export type TraceContext = { traceId: string; spanId: string };

function getActiveSpan() {
  if (!env.OTEL_ENABLED) return null;
  try {
    return trace.getSpan(context.active()) ?? null;
  } catch {
    return null;
  }
}

export function getTraceContext(): TraceContext | null {
  const span = getActiveSpan();
  if (!span) return null;
  try {
    const sc = span.spanContext();
    if (!sc?.traceId || !sc?.spanId) return null;
    return { traceId: sc.traceId, spanId: sc.spanId };
  } catch {
    return null;
  }
}

export function addSpanEvent(name: string, attrs?: SpanAttributes): void {
  const span = getActiveSpan();
  if (!span) return;
  try {
    span.addEvent(name, attrs);
  } catch {
    // ignore
  }
}

export function setSpanAttributes(attrs: SpanAttributes): void {
  const span = getActiveSpan();
  if (!span) return;
  try {
    span.setAttributes(attrs);
  } catch {
    // ignore
  }
}
