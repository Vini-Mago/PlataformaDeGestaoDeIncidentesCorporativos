# PGIC — Relatório de Fechamento da Fase 1 (MVP Operacional)

Data de consolidação: 2026-05-27  
Referências:
- `docs/issues/fase-1/`
- `docs/MATRIZ_RF_TESTE_EVIDENCIA_FASE1.md`
- `docs/RBAC_MATRIZ_FLUXOS_PRINCIPAIS.md`

## 1) Resumo executivo

A Fase 1 foi executada com entregas funcionais e operacionais relevantes para o MVP.  
Dos 8 itens planejados:

- **Feitos:** `F1-01`, `F1-02`, `F1-03`, `F1-04`, `F1-05`, `F1-06`, `F1-07`, `F1-08`
- **Parciais:** nenhum

## 2) Status por item

| Item | Status | Evidência principal |
|---|---|---|
| `F1-01` E2E jornada principal | Feito | `packages/incident-service/src/__tests__/e2e/main-journey.e2e.spec.ts` |
| `F1-02` Idempotência webhook | Feito | deduplicação `externalSource+externalId` + E2E replay |
| `F1-03` Notificação mínima funcional | Feito | `forgotPassword -> notification-service` + evento `request.submitted` por e-mail + SMTP/STARTTLS + teste SMTP sandbox local real |
| `F1-04` Painel operacional mínimo | Feito | dashboard com 3 KPIs + filtros + métricas corrigidas + testes frontend |
| `F1-05` Consolidação RBAC | Feito | `read:own` com ownership, endpoint agregado protegido, matriz RBAC e integração verde |
| `F1-06` Higiene de lint | Feito | `pnpm lint` limpo (0 warnings/erros) |
| `F1-07` Matriz RF x teste x evidência | Feito | `docs/MATRIZ_RF_TESTE_EVIDENCIA_FASE1.md` |
| `F1-08` Provedor de e-mail | Feito | `docs/ops/EMAIL_PROVIDER_DECISION.md` + envs padronizadas |

## 3) Evidências de validação executadas

- `pnpm lint` (monorepo) — verde.
- `pnpm --filter frontend test` e `pnpm --filter frontend build` — verdes.
- `pnpm --filter notification-service test`, `pnpm --filter notification-service test:integration` e `pnpm --filter notification-service build` — verdes; inclui evidência SMTP sandbox local em `SmtpEmailSenderAdapter`.
- `pnpm --filter identity-service test` e `pnpm --filter identity-service build` — verdes.
- `pnpm --filter request-service test`, `pnpm --filter request-service test:integration` e `pnpm --filter request-service build` — verdes; inclui outbox `request.created`/`request.submitted` com `requesterEmail`.
- `pnpm --filter shared test` e `pnpm --filter shared build` — verdes.
- `pnpm --filter incident-service build` — verde.
- `pnpm --filter incident-service test:e2e` — verde fora do sandbox (`1/1`), cobrindo login, criação, atribuição, status, conclusão e histórico visível.
- `pnpm --filter incident-service test:integration` — verde fora do sandbox (`27/27`), incluindo GET de incidente com `statusHistory`.
- `pnpm --filter problem-change-service build`, `pnpm --filter problem-change-service test` e `pnpm --filter problem-change-service test:integration` — verdes (`42/42` integração fora do sandbox, com `.env`).
- `pnpm --filter reporting-service test` e `pnpm --filter reporting-service build` — verdes.
- `pnpm test:contract` — contratos OpenAPI e eventos verdes.

## 4) Pendências residuais para fechamento 100%

Nenhuma pendência residual registrada para os itens `F1-01` a `F1-08`.

## 5) Recomendação objetiva para transição de fase

Fase 1 apta para baseline operacional do MVP e transição de foco para a Fase 2.
