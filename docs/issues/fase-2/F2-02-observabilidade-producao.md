# F2-02 — Observabilidade mínima de produção

- Prioridade: `P0`
- Esforço: `L`
- Owner sugerido: DevOps/SRE
- Dependências: nenhuma

## Objetivo

Ter visibilidade operacional suficiente para detectar e responder incidentes com baixa latência.

## Escopo

- Métricas de latência, erro 5xx, disponibilidade e filas.
- Logs estruturados centralizados por serviço.
- Alertas ativos para sinais críticos.
- Dashboard operacional único para plantão.

## Tarefas técnicas

- Definir conjunto mínimo de métricas por serviço.
- Configurar coleta e visualização unificada.
- Criar regras de alerta com severidade e destinatários.
- Validar alertas por teste controlado (erro e latência).
- Atualizar runbook de observabilidade e resposta inicial.

## Critérios de aceite

- Dashboard e alertas ativos em homologação.
- Simulação de alerta executada e comprovada.
- Runbook descrevendo investigação inicial por tipo de alerta.

## Evidências esperadas

- Links de dashboard e regras de alerta.
- Logs da simulação de disparo de alerta.
- PR com configuração operacional versionada.

## Evidência atual (2026-05-27)

- Endpoint Prometheus `/metrics` adicionado aos serviços Express via `@pgic/shared`.
- Métricas expostas: `pgic_service_up`, `pgic_service_uptime_seconds`, `pgic_http_requests_total`, `pgic_http_request_duration_seconds`.
- Configuração versionada em `infra/observability/`:
  - Prometheus scrape config;
  - Prometheus alert rules;
  - Grafana dashboard;
  - Docker Compose opcional para Prometheus/Grafana.
- Regras de alerta criadas: `PgicServiceDown`, `PgicHighHttp5xxRate`, `PgicHighHttpLatencyP95`, `PgicRabbitMqQueueBacklog`.
- Simulação local adicionada em `scripts/ops/simulate-observability-alert.sh`.

## Validação executada

- `pnpm ops:alert:simulate` — passou; alerta simulado `PgicHighHttp5xxRate`.
- `pnpm --filter @pgic/shared test -- src/http/metrics.middleware.spec.ts` — `1/1` passou.
- `pnpm --filter @pgic/shared build` — passou.
- Builds dos serviços com `/metrics` — passaram: `identity-service`, `request-service`, `incident-service`, `notification-service`, `audit-service`, `reporting-service`, `integration-service`, `problem-change-service`, `sla-service`, `escalation-service`.

## Status de fechamento

- Feito para o escopo técnico versionado da Fase 2: métricas, dashboard, regras de alerta e simulação estão no repositório.
- Pendente operacional fora do repositório: manter Prometheus/Grafana ativos em homologação/produção e registrar URL real do dashboard/on-call.
- Checklist de deploy: `docs/ops/DEPLOYMENT_PENDING_CHECKLIST.md`.
