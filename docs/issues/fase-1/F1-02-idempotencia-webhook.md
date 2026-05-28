# F1-02 — Idempotência de ingestão de webhooks

- Prioridade: `P0`
- Esforço: `M`
- Owner sugerido: Integration + Incident
- Dependências: nenhuma

## Objetivo

Impedir criação duplicada de incidente quando o mesmo evento externo for reenviado.

## Escopo

- Ingestão webhook no `integration-service`.
- Publicação/consumo para `incident-service`.
- Persistência e regra de deduplicação.

## Tarefas técnicas

- Definir chave de idempotência (ex.: `provider + externalEventId`).
- Persistir marca de processamento com constraint única.
- Tratar reenvio como operação segura (status 2xx com resultado idempotente).
- Adicionar testes unitários e integração cobrindo replay do evento.

## Critérios de aceite

- Reenvio do mesmo payload não cria segundo incidente.
- Logs mostram decisão idempotente com correlação.
- Testes automatizados cobrindo sucesso e replay.

## Riscos

- Chave de idempotência insuficiente.
- Corrida de concorrência sem proteção transacional.

## Evidências esperadas

- Migration/ajuste de schema (se necessário).
- Suite de testes verde.

## Evidência atual (2026-05-26)

- Chave idempotente implementada por `externalSource + externalId` no `incident-service`:
  - constraint única em `packages/incident-service/prisma/schema.prisma`.
  - lookup prévio via `findByExternalRef` em `HandleIntegrationIncidentIngestUseCase`.
- Teste E2E cobrindo replay sem duplicação:
  - `packages/integration-service/src/__tests__/e2e/webhook-to-incident.e2e.spec.ts` valida `created: true` na primeira ingestão e `created: false` no replay, com mesmo `incident.id`.
- Logging de decisão idempotente adicionado:
  - `decision: "created_new"` e `decision: "replay_existing"` com `externalSource`, `externalId` e `correlationId`.
