# CHANGELOG - P0/P3 Observability (v15)

Date: 2026-02-10

## Scope

Phase 3 (Observability) theo **Hadilao Software Design Spec v4 Enterprise**:

- Metrics Prometheus (HTTP/DB/Redis/Runtime) + route normalization + in-flight.
- Slow query/slow redis sampling + admin endpoints để triage nhanh.
- OpenTelemetry tracing (OTLP/HTTP) + correlation log ↔ trace.
- Ops stack: Prometheus + Grafana + OTel Collector + Jaeger.

## Changes

### API instrumentation

- HTTP: `httpLogger` now tracks in-flight requests and passes best-effort normalized route.
- MySQL: instrumented `pool.query/execute` to:
  - record metrics
  - detect slow queries (threshold `SLOW_QUERY_MS`)
  - push ring-buffer samples with fingerprint
  - emit OTel span events for slow queries
- Redis: instrumented `client.sendCommand()` to:
  - record metrics
  - detect slow commands (threshold `REDIS_SLOW_OP_MS`)
  - push ring-buffer samples with fingerprint
  - emit OTel span events for slow commands

### Admin endpoints (triage)

- `GET /api/v1/admin/observability/slow-queries?limit=100&minMs=200`
- `GET /api/v1/admin/observability/slow-redis?limit=100&minMs=50`

### Ops

- Added `apps/api/ops/observability/*`:
  - `docker-compose.observability.yml`
  - Prometheus scrape default: `host.docker.internal:3001` (Windows baseline)
  - Grafana provisioning + dashboard JSON
  - OTel Collector pipeline OTLP → Jaeger
