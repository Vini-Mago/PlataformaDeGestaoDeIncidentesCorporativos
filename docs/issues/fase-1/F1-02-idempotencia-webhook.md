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
