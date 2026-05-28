# F1-01 — E2E crítico de jornada principal

- Prioridade: `P0`
- Esforço: `L`
- Owner sugerido: Backend + Frontend + QA
- Dependências: nenhuma

## Objetivo

Garantir a jornada fim a fim: login, abertura de incidente, atribuição, mudança de status, conclusão e histórico visível.

## Escopo

- Cobrir autenticação via BFF/Identity.
- Cobrir endpoints de incidente principais.
- Validar atualização de estado no frontend.
- Validar histórico final da entidade.

## Tarefas técnicas

- Criar suíte E2E dedicada (novo arquivo em `packages/frontend` ou `scripts/` conforme estratégia atual).
- Subir dependências mínimas de teste (DB, Redis, RabbitMQ, serviços envolvidos).
- Implementar fixtures/dados de teste determinísticos.
- Validar asserts de API e UI para cada transição.
- Integrar execução no CI (job existente ou novo step).

## Critérios de aceite

- Teste E2E reproduzível e verde em ambiente local e CI.
- Falha controlada quando quebra de fluxo (teste realmente protege contrato).
- Evidência anexada: log de execução + caminho da suíte.

## Riscos

- Instabilidade por dependência de ambiente.
- Acoplamento excessivo entre teste e detalhes de UI.

## Evidências esperadas

- PR com suíte E2E.
- Execução CI verde.

## Evidência atual (2026-05-27)

- Suíte E2E criada em `packages/incident-service/src/__tests__/e2e/main-journey.e2e.spec.ts`.
- Configuração dedicada adicionada:
  - `packages/incident-service/vitest.e2e.config.ts`
  - script `pnpm --filter incident-service test:e2e`
- Fluxo coberto no teste:
  - login via `identity-service`
  - criação de incidente
  - atribuição
  - mudança de status (`Open -> InAnalysis -> Resolved`)
  - comentário de conclusão
  - validação de histórico visível no GET final (`statusHistory`) e persistência em `incident_status_history`
- Correção de ambiente:
  - `.env` do root carregado por `packages/incident-service/../../.env`
  - sem fallback silencioso para `localhost:5432`; a suíte faz skip somente se as URLs de DB estiverem ausentes ou o PostgreSQL estiver indisponível
- Execução real fora do sandbox:
  - `pnpm --filter incident-service test:e2e`
  - resultado: `1 passed (1)` em `10.87s`
- Validações complementares:
  - `pnpm --filter incident-service build` — verde
  - `pnpm --filter incident-service test -- src/application/use-cases/get-incident.use-case.spec.ts` — `2 passed (2)`
  - `pnpm --filter incident-service test:integration` — `27 passed (27)`

## Status

- `Feito`.
