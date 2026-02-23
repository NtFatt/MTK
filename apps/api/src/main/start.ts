import { initOtel } from "../infrastructure/observability/otel.js";

// Start OpenTelemetry first (if enabled), then boot the server.
await initOtel();

// Dynamic import ensures OTel hooks are installed before loading the app graph.
await import("./server.js");
