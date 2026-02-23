# Ops - Observability stack (v15)

Stack: **Prometheus + Grafana + OTelCollector + Jaeger**

## 1) Start

Từ thư mục `apps/api/ops/observability/`:

```bash
docker compose -f docker-compose.observability.yml up -d
```

Ports:

- Prometheus: `9090`
- Grafana: `3000` (default `admin/admin`)
- Jaeger UI: `16686`
- OTLP/HTTP: `4318` (collector)

## 2) Prometheus scrape target

`prometheus/prometheus.yml` mặc định scrape:

```yml
targets: ["host.docker.internal:3001"]
```

Phù hợp Windows + Docker Desktop.

Nếu Linux:

- đổi sang IP host (vd: `172.17.0.1:3001`) hoặc
- chạy Prometheus ở `network_mode: host` (trade-off: port binding).

## 3) API config

Trong `apps/api/.env`:

```env
METRICS_ENABLED=true
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

## 4) Grafana dashboard

Grafana được provision sẵn:

- Datasource: Prometheus
- Dashboard: **Hadilao API - Observability (v15)**

File dashboard: `grafana/dashboards/hadilao_api_observability.json`
