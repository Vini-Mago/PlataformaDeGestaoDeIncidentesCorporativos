# PGIC — Runbook de Observabilidade Operacional (MVP)

Data: 2026-05-27

## Objetivo

Criar verificação operacional automatizada e métricas Prometheus para reduzir risco de indisponibilidade silenciosa.

## Componentes

- `scripts/ops/check-platform-health.sh`
- `scripts/ops/nightly-maintenance.sh`
- `scripts/ops/simulate-observability-alert.sh`
- `infra/observability/prometheus/prometheus.yml`
- `infra/observability/prometheus/pgic-alerts.yml`
- `infra/observability/grafana/dashboards/pgic-operational-overview.json`
- `infra/observability/docker-compose.observability.yml`
- Comando: `pnpm ops:healthcheck`
- Comando consolidado: `pnpm ops:maintenance`
- Evidência operacional: `pnpm ops:evidence`
- Simulação de alerta: `pnpm ops:alert:simulate`

## O que é verificado

1. Health HTTP (`/health`) de todos os serviços e gateway.
2. Containers de infra ativos (`pgic-postgres`, `pgic-redis`, `pgic-rabbitmq`).
3. Profundidade máxima de fila RabbitMQ (`rabbitmqctl list_queues`) comparada ao threshold.
4. Métricas HTTP por serviço em `/metrics`:
   - disponibilidade do processo (`pgic_service_up`);
   - uptime (`pgic_service_uptime_seconds`);
   - volume por método/rota/classe de status (`pgic_http_requests_total`);
   - latência por histograma (`pgic_http_request_duration_seconds`).
5. Regras Prometheus para indisponibilidade, 5xx, p95 alto e backlog de fila.

## Variáveis

- `OPS_ALERT_WEBHOOK_URL` (opcional): webhook para alerta de falha.
- `RABBITMQ_MAX_QUEUE_DEPTH` (default `1000`): threshold de backlog.
- `POSTGRES_CONTAINER_NAME`, `REDIS_CONTAINER_NAME`, `RABBITMQ_CONTAINER_NAME` (opcionais).

## Uso

```bash
pnpm ops:healthcheck
```

Exit codes:

- `0`: checks OK
- `1`: uma ou mais falhas detectadas (e alerta enviado se webhook configurado)

## Stack Prometheus/Grafana

```bash
cd infra/observability
docker compose -f docker-compose.observability.yml up -d
```

URLs padrão:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

O Prometheus local raspa os serviços no host via `host.docker.internal:<porta>` e endpoint `/metrics`.

## Alertas Prometheus

Arquivo: `infra/observability/prometheus/pgic-alerts.yml`

- `PgicServiceDown`: target sem scrape por 2 minutos.
- `PgicHighHttp5xxRate`: taxa de 5xx acima de `0.05 req/s` por 5 minutos.
- `PgicHighHttpLatencyP95`: p95 acima de `1s` por 10 minutos.
- `PgicRabbitMqQueueBacklog`: fila RabbitMQ acima de `1000` mensagens por 5 minutos, quando métrica/exporter estiver disponível.

## Simulação controlada

```bash
pnpm ops:alert:simulate
```

A simulação valida o JSON do dashboard, confirma a presença da regra `PgicHighHttp5xxRate` e emite log controlado de disparo de alerta.

## Agendamento recomendado

Exemplo cron (a cada 5 minutos):

```cron
*/5 * * * * cd /opt/pgic && pnpm ops:healthcheck >> /var/log/pgic-ops-health.log 2>&1
```

Template consolidado de manutenção:

- `infra/cron/pgic-ops-maintenance.cron`

## Evidência mínima para checklist

- Log de execução periódica com timestamp.
- Registro de threshold usado (`RABBITMQ_MAX_QUEUE_DEPTH`).
- Evidência de recebimento de alerta (quando houver falha simulada).
- Export de `/metrics` de pelo menos um serviço.
- Screenshot/link do dashboard Grafana em homologação quando a stack estiver ativa.

Checklist consolidado de ativação em ambiente: `docs/ops/DEPLOYMENT_PENDING_CHECKLIST.md`.
