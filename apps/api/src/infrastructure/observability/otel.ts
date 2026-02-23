import { env } from "../config/env.js";

/**
 * OpenTelemetry bootstrap.
 *
 * Notes:
 * - this is intentionally optional (env.OTEL_ENABLED)
 * - start it as early as possible (see src/main/start.ts)
 */
export async function initOtel(): Promise<void> {
  if (!env.OTEL_ENABLED) return;

  try {
    const { diag, DiagConsoleLogger, DiagLogLevel } = await import("@opentelemetry/api");
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");
    const { Resource } = await import("@opentelemetry/resources");
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = await import(
      "@opentelemetry/semantic-conventions",
    );

    // Keep OTel internal logging quiet by default.
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: env.OTEL_SERVICE_NAME,
      [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
      ...(parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES) ?? {}),
    });

    const exporter = new OTLPTraceExporter({
      url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Keep noise low.
          "@opentelemetry/instrumentation-fs": { enabled: false },
        } as any),
      ],
    });

    await sdk.start();

    // Graceful shutdown.
    const shutdown = async () => {
      try {
        await sdk.shutdown();
      } catch {
        // ignore
      }
    };

    process.on("SIGTERM", () => void shutdown());
    process.on("SIGINT", () => void shutdown());
  } catch {
    // If OTel fails, do not break the app.
  }
}

function parseResourceAttributes(raw: string | undefined): Record<string, string> | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // Format: k1=v1,k2=v2
  const out: Record<string, string> = {};
  for (const part of s.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf("=");
    if (idx <= 0) continue;
    const k = seg.slice(0, idx).trim();
    const v = seg.slice(idx + 1).trim();
    if (!k || !v) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}
