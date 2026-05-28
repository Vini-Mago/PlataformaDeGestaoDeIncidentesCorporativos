# PGIC — Política de Retry, DLQ e Reprocessamento

Data: 2026-05-27
Escopo: F2-08 (política uniforme de retry/DLQ/reprocessamento)

## Objetivo

Padronizar comportamento assíncrono para reduzir perda de mensagem e tornar operação previsível.

## Regras padrão

### 1) Classificação de erro

- `erro transitório`: timeout de rede, `5xx`, indisponibilidade temporária.
- `erro terminal`: payload inválido, contrato inválido, regra de negócio impossível.

### 2) Retry e backoff

- Retry automático para erros transitórios.
- Backoff exponencial com jitter para chamadas outbound.
- Limite máximo de tentativas por mensagem/evento (`maxAttempts`).

### 3) Encaminhamento para DLQ

Enviar para DLQ quando:

- esgotar `maxAttempts`;
- houver erro terminal;
- houver falha não recuperável identificada pelo consumidor.

### 4) Reprocessamento

- Reprocessamento apenas por endpoint autenticado e auditável.
- Reprocessamento deve:
  - marcar item original como reprocessado;
  - produzir novo item de outbox com referência ao item DLQ (`reprocessedFromDlqId`);
  - impedir reprocessamento duplicado.

### 5) Correlação ponta a ponta

- Toda mensagem crítica deve carregar `correlationId`.
- Logs devem incluir `correlationId`, `eventName`, `attempt` (quando aplicável), `errorMessage`.

## Estado atual no repositório (escopo técnico)

- `integration-service`:
  - fluxo de outbound assíncrono com retry/backoff e DLQ;
  - APIs de listagem e reprocessamento de DLQ;
  - testes de integração cobrindo DLQ e reprocessamento.
- Demais serviços:
  - padrão outbox existe;
  - política ainda não totalmente uniforme entre consumers (lacuna operacional futura).

## Evidências e comandos de validação

1. Integração do fluxo principal de DLQ/reprocessamento:

```bash
pnpm --filter integration-service run test:integration
```

2. Contratos de eventos:

```bash
pnpm test:contract:events
```

3. Saúde operacional da plataforma:

```bash
pnpm ops:healthcheck
```

## Critérios de aceite (feito técnico)

- Existe política versionada com regras de retry/DLQ/reprocessamento.
- Existe teste automatizado cobrindo:
  - entrada em DLQ;
  - listagem de DLQ;
  - reprocessamento e proteção contra duplicidade.
- Existe trilha de correlação no fluxo crítico de integração.

## Próxima etapa (produção)

- Uniformizar os consumers restantes para o mesmo padrão explícito de classificação de erro + retry + DLQ.
- Publicar dashboard operacional de filas/DLQ em ambiente homologação/produção com owner de operação.
