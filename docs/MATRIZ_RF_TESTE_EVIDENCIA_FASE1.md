# PGIC — Matriz RF x Teste x Evidência (Fase 1)

Data de referência: 2026-05-27  
Escopo: fechamento de rastreabilidade da Fase 1 (`F1-01` … `F1-08`).

## Regras de atualização

- Toda mudança funcional em RF prioritário deve atualizar esta matriz no mesmo PR.
- Cada linha deve apontar para:
  - suíte de teste (arquivo),
  - comando de execução,
  - evidência atual (documento/issue/log).
- Se houver lacuna, registrar `Status = Parcial` com owner sugerido.

## Matriz

| RF / Item | Cobertura de teste | Comando | Evidência atual | Status |
|---|---|---|---|---|
| `F1-01` E2E jornada principal (login -> incidente -> atribuição -> status -> histórico) | `packages/incident-service/src/__tests__/e2e/main-journey.e2e.spec.ts` | `pnpm --filter incident-service test:e2e` | `docs/issues/fase-1/F1-01-e2e-jornada-principal.md` | Feito |
| `F1-02` Idempotência de webhook | `packages/integration-service/src/__tests__/e2e/webhook-to-incident.e2e.spec.ts` | `pnpm --filter integration-service test:e2e` | `docs/issues/fase-1/F1-02-idempotencia-webhook.md` | Feito |
| `F1-03` Notificação mínima funcional (recuperação + evento crítico) | Unitários: `packages/notification-service/src/application/use-cases/create-notification.use-case.spec.ts`, `packages/notification-service/src/config/email-config.spec.ts`, `packages/notification-service/src/application/use-cases/handle-request-domain-event.use-case.spec.ts`; SMTP sandbox real: `packages/notification-service/src/adapters/driven/email/smtp-email-sender.adapter.integration.spec.ts`; integração com `AuthController.forgotPassword` e outbox `request.submitted` com `requesterEmail` | `pnpm --filter identity-service test` / `pnpm --filter notification-service test` / `pnpm --filter notification-service test:integration` / `pnpm --filter request-service test:integration` / builds dos pacotes afetados / `pnpm test:contract` | `docs/issues/fase-1/F1-03-notificacao-minima-funcional.md` + `docs/ops/EMAIL_PROVIDER_DECISION.md` | Feito |
| `F1-04` Painel operacional mínimo | Componente dashboard + teste de UI em `packages/frontend/src/App.test.tsx` | `pnpm --filter frontend test` / `pnpm --filter frontend build` | `docs/issues/fase-1/F1-04-painel-operacional-minimo.md` | Feito |
| `F1-05` Consolidação RBAC (401/403) | `incident-service`, `request-service`, `problem-change-service` integration specs (inclui casos `read:own`, versões e endpoint agregado protegido) | `pnpm --filter problem-change-service test:integration` + testes unitários/builds dos pacotes afetados | `docs/RBAC_MATRIZ_FLUXOS_PRINCIPAIS.md` + `docs/issues/fase-1/F1-05-consolidacao-rbac.md` | Feito |
| `F1-06` Higiene de lint | Tipagem de testes em `problem-change-service` e `request-service` | `pnpm lint` | `docs/issues/fase-1/F1-06-higiene-lint.md` | Feito |
| `F1-07` Matriz RF x Teste x Evidência | Este documento | N/A | `docs/issues/fase-1/F1-07-matriz-rf-teste-evidencia.md` | Feito |
| `F1-08` Decisão de provedor de e-mail | Documental + config | N/A | `docs/ops/EMAIL_PROVIDER_DECISION.md` + `.env.example` + `packages/notification-service/.env.example` | Feito |

## Lacunas explícitas (owner e próximo passo)

Nenhuma lacuna residual registrada para a Fase 1.
