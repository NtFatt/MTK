# Observability (v15)

Mục tiêu: chạy local **Prometheus + Grafana + OTelCollector + Jaeger** và nhìn được:

- HTTP RED metrics (RPS / error rate / latency p95)
- DB/Redis USE metrics (throughput / latency / slow samples)
- Runtime health (rss, event-loop delay)
- Trace end-to-end (request → mysql2/redis) qua Jaeger

Theo đúng Phase 3 (Observability) trong *Hadilao Software Design Spec v4 Enterprise*.

---

## 1) Quick start

### 1.1 Start API

Trong root `hadilao-online/`:

```bash
pnpm -C apps/api install
cp apps/api/.env.example apps/api/.env
pnpm -C apps/api db:reset --yes
pnpm -C apps/api dev
```

Kiểm tra:

- Health: `GET http://localhost:3001/api/v1/health`
- Metrics: `GET http://localhost:3001/api/v1/metrics`

### 1.2 Start observability stack (Docker)

Ở `apps/api/ops/observability/`:

```bash
docker compose -f docker-compose.observability.yml up -d
```

Truy cập:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (mặc định: `admin/admin`)
- Jaeger: `http://localhost:16686`
- OTel Collector (OTLP/HTTP): `http://localhost:4318/v1/traces`

---

## 2) ENV cần bật

Trong `apps/api/.env`:

```env
METRICS_ENABLED=true
METRICS_PATH=/api/v1/metrics
SLOW_QUERY_MS=200
REDIS_SLOW_OP_MS=50

OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=hadilao-api
```

---

## 3) Admin triage endpoints (slow samples)

> Các mẫu là **ring-buffer in-memory** (không phải SoT), mục tiêu để debug nhanh trong local/dev.

- Slow MySQL:
  - `GET /api/v1/admin/observability/slow-queries?limit=100&minMs=200`
- Slow Redis:
  - `GET /api/v1/admin/observability/slow-redis?limit=100&minMs=50`

---

## 4) Dashboard mapping (PromQL gợi ý)

- **RPS**:
  - `sum(rate(hadilao_http_requests_total[1m]))`
- **Error rate**:
  - `sum(rate(hadilao_http_errors_total[5m])) / sum(rate(hadilao_http_requests_total[5m]))`
- **p95 latency (HTTP)**:
  - `histogram_quantile(0.95, sum(rate(hadilao_http_request_duration_ms_bucket[5m])) by (le))`
- **p95 latency (DB)**:
  - `histogram_quantile(0.95, sum(rate(hadilao_db_query_duration_ms_bucket[5m])) by (le))`
- **p95 latency (Redis)**:
  - `histogram_quantile(0.95, sum(rate(hadilao_redis_command_duration_ms_bucket[5m])) by (le))`

---

## 5) Notes quan trọng

- Prometheus trong Docker sẽ scrape API ngoài host theo mặc định:
  - `host.docker.internal:3001` (Windows baseline)
- Nếu chạy Linux, bạn có thể đổi target sang IP host hoặc dùng `--network host`.
