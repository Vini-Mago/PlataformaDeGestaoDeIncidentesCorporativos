# PGIC Observability Stack

Stack mínima para F2-02: Prometheus + Grafana + regras de alerta.

## Subir localmente

```bash
cd infra/observability
docker compose -f docker-compose.observability.yml up -d
```

URLs padrão:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (`admin` / `pgic-admin` por padrão local)

## Pré-requisito

Os serviços PGIC precisam expor `/metrics`. O endpoint foi adicionado aos serviços Express via `@pgic/shared`.

## Artefatos

- `prometheus/prometheus.yml`: scrape config dos serviços PGIC.
- `prometheus/pgic-alerts.yml`: regras `ServiceDown`, `HighHttp5xxRate`, `HighHttpLatencyP95`, `RabbitMqQueueBacklog`.
- `grafana/dashboards/pgic-operational-overview.json`: dashboard operacional mínimo.
- `scripts/ops/simulate-observability-alert.sh`: simulação local de alerta para evidência.

## Simulação

```bash
pnpm ops:alert:simulate
```

A simulação valida o JSON do dashboard, verifica a regra `PgicHighHttp5xxRate` e gera log de alerta controlado.
