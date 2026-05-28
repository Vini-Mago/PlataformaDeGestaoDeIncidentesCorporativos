# F2-08 — Política uniforme de retry/DLQ/reprocessamento

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: Integration + Platform
- Dependências: `F2-02`

## Objetivo

Uniformizar comportamento assíncrono entre integrações para reduzir perda de mensagem e retrabalho operacional.

## Escopo

- Regras comuns de retry e backoff.
- Critérios de envio para DLQ.
- Processo de reprocessamento seguro.
- Rastreabilidade por correlation id ponta a ponta.

## Tarefas técnicas

- Definir política padrão versionada para serviços assíncronos.
- Mapear exceções justificadas por integração.
- Implementar/verificar instrumentação de correlation id.
- Criar testes de falha, retry, DLQ e reprocessamento.
- Publicar runbook específico de incidentes de mensageria.

## Critérios de aceite

- Política aprovada e aplicada nos fluxos críticos.
- Testes automatizados cobrindo cenários de falha/reprocessamento.
- Runbook com passos claros para operação.

## Evidências esperadas

- PR de implementação e documentação.
- Execução dos testes automatizados.
- Exemplo de trilha completa via correlation id.

## Evidência atual (2026-05-27)

- Política técnica versionada:
  - `docs/ops/MESSAGING_RETRY_DLQ_POLICY.md`
- Fluxo de referência implementado em `integration-service`:
  - retry/backoff e DLQ em outbound assíncrono;
  - APIs de DLQ e reprocessamento (`GET /api/integration-dlq`, `POST /api/integration-dlq/:id/reprocess`);
  - proteção contra reprocessamento duplicado.
- Testes automatizados de evidência:
  - `packages/integration-service/src/__tests__/integration/integration-service.integration.spec.ts`
  - cenário de listagem de DLQ + reprocessamento validado.
- Contratos de eventos com verificação automatizada:
  - `scripts/contracts/verify-event-contracts.ts`

## Validação executada

- `pnpm --filter integration-service run test:integration`
- `pnpm test:contract:events`

## Status de fechamento

- Feito técnico para política + fluxo crítico de integração com evidência automatizada.
- Pendente de maturidade cross-service: uniformizar explicitamente todos os consumers/outbox relays no mesmo padrão de classificação de erro e política de retry.
