# Revisão técnica — estado do repositório PGIC

Documento de referência rápida sobre o que existe no monorepo e como as peças se ligam. Útil para onboarding e para alinhar com [RequisitosCorp.md](RequisitosCorp.md) / [ChecklistCompletoDetalhadoPassoAPasso.md](ChecklistCompletoDetalhadoPassoAPasso.md).

## Visão geral

Monorepo **pnpm** com `@pgic/shared` (DTOs de erro, HTTP, validação, cache Redis, constantes RabbitMQ) e microsserviços em **TypeScript** (Express, Prisma, Postgres dedicado por serviço, Redis, RabbitMQ). O **Nginx** em Docker atua como API gateway para os serviços expostos no host.

## Pacotes em `packages/`

| Pacote | Função resumida |
|--------|-----------------|
| `shared` | Contratos e infra HTTP comum (`@pgic/shared`) |
| `identity-service` | Autenticação (JWT, OAuth opcional), utilizadores, sessões, RBAC base, logs de acesso, outbox |
| `request-service` | Catálogo e requisições de serviço (RF-6) |
| `incident-service` | Incidentes (RF-5) |
| `problem-change-service` | Problemas e mudanças (RF-7) |
| `sla-service` | Políticas e tempo útil (RF-8.x) |
| `escalation-service` | Escalonamento |
| `notification-service` | Notificações |
| `audit-service` | Auditoria |
| `reporting-service` | KPIs / relatórios |
| `api-docs` | Swagger agregado |
| `bff` | Backend-for-frontend |
| `frontend` | SPA (Vite) |

Serviços com **Prisma** (migrações próprias): identity, request, incident, problem-change, sla, escalation, notification, audit, reporting. Na raiz: `pnpm db:migrate:deploy` aplica todas em sequência.

## Gateway (Nginx)

Prefixos principais em `nginx/nginx.conf`: `/identity/`, `/request/`, `/incidents/`, `/problem-change/`, `/sla/`, `/escalation/`, `/notifications/`, `/audit/`, `/reporting/`, `/api-docs/`. Não há prefixo de versão tipo `/v1/` no path; evolução de API deve ser tratada por convenção nos controladores e na documentação OpenAPI.

## Identity / segurança

O **identity-service** inclui registo, login, refresh/sessões, recuperação de senha, publicação de eventos (RabbitMQ/outbox) e seed RBAC. As permissões cobrem **IAM** (utilizadores, sessões, logs de acesso) e **módulos ITSM** (`incidents`, `requests`, `problems`, `changes`, `sla`, `escalation`, `notifications`, `audit`, `reporting`, `settings`), no formato `module:action:scope`. Papéis seed: `admin`, `gestor`, `analista`, `noc`, `user`, com matrizes definidas em `PrismaAuthorizationRepository` (`ensureAuthorizationSeed` ao arrancar). **Enforcement** nas APIs dos outros microsserviços (ex.: `requirePermission("incidents","read","all")`) é evolução incremental por serviço.

## Documentação relacionada

- [DEVELOPMENT.md](DEVELOPMENT.md) — como correr tudo localmente
- [MICROSERVICES_LIST.md](MICROSERVICES_LIST.md) — lista de serviços e eventos
- [AnaliseRequisitos.md](AnaliseRequisitos.md) — RFs do domínio

Atualize este ficheiro quando fizer alterações estruturais significativas (novos serviços, mudança de gateway ou de stack).

## JWT e RBAC nos microsserviços

O **identity-service** inclui no JWT as chaves efetivas `perms` (lista `module:action:scope`) ao registar, iniciar sessão, refrescar token e OAuth. Os outros serviços validam o mesmo segredo HS256 e aplicam `requireJwtPermission` / `requireAnyJwtPermission` do `@pgic/shared` nas rotas HTTP. Utilizadores com `role: admin` continuam a contornar a verificação fina (compatível com o middleware RBAC interno). Tokens antigos sem `perms` falham com **403** nas novas gatekeepers até novo login.

### Âmbito `read:own` nas APIs de domínio

Em **incident-service**, **request-service** e **problem-change-service**, utilizadores sem permissão de leitura global ao módulo ficam restritos aos registos em que são **requisitante/assignado** (incidentes e pedidos) ou **criador** (`createdById`, problemas e mudanças). As listagens ignoram filtros por outro utilizador quando só há `read:own`.
