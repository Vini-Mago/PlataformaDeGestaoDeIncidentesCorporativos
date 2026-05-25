# Verificação de Afirmações da Documentação (PGIC)

Data: 2026-05-25  
Escala:
- `Verdadeira` = aderência total ao repositório atual.
- `Parcial (0-10)` = aderência incompleta (0 pior, 10 quase total).
- `Falsa` = contradiz o repositório atual.

## Estado atual por afirmação

| Fonte | Afirmação | Classificação | Nota | Evidência |
|---|---|---|---:|---|
| `README.md` | `pnpm dev` sobe stack local completo | Verdadeira | 10 | `package.json`, `scripts/dev-all.ts` |
| `README.md` | Estrutura de pacotes listada no README existe | Verdadeira | 10 | `packages/` |
| `README.md` | Prefixos de gateway listados estão corretos | Verdadeira | 10 | `nginx/templates/default.conf.template` |
| `docs/COMO_RODAR.md` | Fluxo principal (`cp .env.example`, `pnpm install`, `pnpm dev`) | Verdadeira | 10 | conteúdo + scripts |
| `docs/DEVELOPMENT.md` | `pnpm dev` aplica migrations deploy e sobe apps | Verdadeira | 10 | `scripts/dev-all.ts` |
| `docs/TECHNICAL_REVIEW.md` | Stack (TS, Postgres/Prisma, Redis, RabbitMQ, Nginx) | Verdadeira | 10 | `package.json`, `docker-compose.yml` |
| `docs/MICROSERVICES.md` | Serviços principais já estão implementados no monorepo | Verdadeira | 10 | `packages/*-service` |
| `docs/MICROSERVICES_LIST.md` | `sla-service` existe (não planejado) | Verdadeira | 10 | `packages/sla-service/` |
| `docs/MICROSERVICES_LIST.md` | `integration-service` implementado (MVP) | Verdadeira | 10 | `packages/integration-service/` |
| `packages/request-service/README.md` | Prefixo `/request/` | Verdadeira | 10 | template Nginx |
| `packages/problem-change-service/README.md` | Prefixo `/problem-change/` | Verdadeira | 10 | template Nginx |
| `packages/sla-service/README.md` | Prefixo `/sla/` | Verdadeira | 10 | template Nginx |
| `packages/escalation-service/README.md` | Prefixo `/escalation/` | Verdadeira | 10 | template Nginx |
| `packages/notification-service/README.md` | Prefixo `/notifications/` | Verdadeira | 10 | template Nginx |
| `packages/audit-service/README.md` | Prefixo `/audit/` | Verdadeira | 10 | template Nginx |
| `packages/reporting-service/README.md` | Prefixo `/reporting/` | Verdadeira | 10 | template Nginx |
| `package.json` | Scripts `dev:*` por serviço existem | Verdadeira | 10 | `package.json` |
| `package.json` | `docker:up` e `docker:down` existem | Verdadeira | 10 | `package.json` |
| `.env.example` | Portas padrão atuais são `320x`, `BFF 3300`, `GATEWAY 58080` | Verdadeira | 10 | `.env.example` |
| `docs/RequisitosCorp.md` | Documento é normativo de requisitos | Verdadeira | 10 | conteúdo |
| `docs/AnaliseRequisitos.md` | Documento é especificação funcional | Verdadeira | 10 | conteúdo |
| `docs/BACKLOG_EXECUCAO_FASEADO.md` | Documento é backlog/plano | Verdadeira | 10 | conteúdo |
| `docs/issues/fase-1/*.md` | Arquivos são planejamento de execução | Verdadeira | 10 | conteúdo |
| `docs/TECHNICAL_REVIEW.md` | Enforcement RBAC está consolidado em todos os fluxos | Parcial (0-10) | 6 | há implementação relevante, mas cobertura total exige validação e2e/testes de autorização em todos os serviços |
| `docs/ChecklistContextoCorporativoCompleto.md` | Marcadores `[x]/[~]/[ ]` refletem exatamente o estado atual | Parcial (0-10) | 5 | várias partes dependem de ambiente/ops e não são comprováveis só por código |
| `docs/ChecklistCompletoDetalhadoPassoAPasso.md` | Marcadores de conclusão representam fechamento real das fases | Parcial (0-10) | 4 | documento é majoritariamente processual; faltam evidências operacionais em produção |
| `docs/OQueFoiFeitoBaseadoEmCommits.md` | Síntese histórica está 100% atual e completa | Parcial (0-10) | 5 | útil como histórico, mas sofre envelhecimento e não é validação contínua |
| `docs/MICROSERVICES_LIST.md` | Todos os detalhes de capacidades/eventos descritos já estão completos em produção | Parcial (0-10) | 6 | parte implementada, parte depende de maturidade e validação operacional |
| `docs/ChecklistContextoCorporativoCompleto.md` | Associação incidente-problema é refletida diretamente no campo `incident.problemId` | Parcial (0-10) | 3 | `GET /incidents/incidents` retorna `problemId: null` enquanto `GET /problem-change/problems/linked-for-incidents` retorna vínculo ativo |
| `docs/ChecklistCompletoDetalhadoPassoAPasso.md` | Fluxo completo de mudança (`Scheduled -> InProgress -> Completed`) funciona pela UI sem workaround | Parcial (0-10) | 8 | corrigido em `packages/frontend/src/ChangeSection.tsx`; antes falhava por enviar campos imutáveis; após correção, PATCH final envia apenas `{ \"status\": \"Completed\" }` |
| `docs/ChecklistContextoCorporativoCompleto.md` | Sincronização de `incident.problemId` com vínculo problema-incidente está coberta por testes automatizados | Parcial (0-10) | 7 | cobertura adicionada: `packages/problem-change-service/src/adapters/driven/persistence/prisma-problem.repository.spec.ts` (outbox link/unlink) e `packages/incident-service/src/application/use-cases/handle-problem-incident-link.use-case.spec.ts` (apply link/unlink no incidente); validação E2E runtime pendente por limitação de sandbox |
| `docs/ExemploDennys.md` | Conteúdo descreve PGIC | Falsa | 0 | descreve outro produto (“BuildMind AI”) |

## Resumo numérico

- Verdadeiras: 24
- Parciais: 9
- Falsas: 1

## Leitura rápida do ponto exato

1. Base técnica e execução local: **alta aderência** (10/10 na maioria).
2. Cobertura funcional total e maturidade operacional (compliance/HA/observabilidade): **parcial** (4-6/10).
3. Conteúdo fora de escopo: **1 item falso claro** (`docs/ExemploDennys.md`).
