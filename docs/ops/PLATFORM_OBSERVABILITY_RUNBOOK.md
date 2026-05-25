# PGIC — Runbook de Observabilidade Operacional (MVP)

Data: 2026-05-25

## Objetivo

Criar verificação operacional automatizada para reduzir risco de indisponibilidade silenciosa.

## Script

- `scripts/ops/check-platform-health.sh`
- `scripts/ops/nightly-maintenance.sh`
- Comando: `pnpm ops:healthcheck`
- Comando consolidado: `pnpm ops:maintenance`
- Evidência operacional: `pnpm ops:evidence`

## O que é verificado

1. Health HTTP (`/health`) de todos os serviços e gateway.
2. Containers de infra ativos (`pgic-postgres`, `pgic-redis`, `pgic-rabbitmq`).
3. Profundidade máxima de fila RabbitMQ (`rabbitmqctl list_queues`) comparada ao threshold.

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
