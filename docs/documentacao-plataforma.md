## 5.1.1 Segmentação da Arquitetura

O sistema adota uma **arquitetura de microsserviços** organizada em camadas (hexagonal + DDD), com fronteira clara entre **frontend**, **BFF** e **serviços de domínio**. A interface é uma SPA em React/TypeScript; o acesso autenticado passa pelo BFF, que traduz cookies de sessão em JWT e faz proxy HTTP para cada microsserviço — não há monólito único de aplicação.

**Frontend** (`packages/frontend/`) — SPA React com Vite, consumindo APIs via BFF; módulos ITSM (incidentes, requisições, problemas, mudanças, dashboard e sistema).

**BFF** (`packages/bff/`) — Backend for Frontend em Express: autenticação (login, registo, OAuth Google, refresh), cookies `httpOnly` e agregação de chamadas aos microsserviços sob prefixos `/identity`, `/incidents`, `/request`, etc.

**Microsserviços de domínio** (`packages/*-service/`) — cada bounded context com API Express, Prisma e base PostgreSQL própria: identidade e RBAC, incidentes, requisições/catálogo, problemas e mudanças, SLA, escalonamento, notificações, auditoria, reporting e integrações.

**Núcleo compartilhado** (`packages/shared/`, `@pgic/shared`) — contratos HTTP, erros, validação, middleware JWT/RBAC, cache Redis e constantes de eventos RabbitMQ reutilizados pelos serviços.

**API Gateway** (`nginx/`, Docker) — proxy reverso Nginx com prefixos por serviço (`/identity/`, `/incidents/`, `/request/`, …) para acesso direto, integrações e documentação, sem acoplamento ao BFF.

**Filas** — **RabbitMQ** para eventos assíncronos entre serviços, outbox e reprocessamento (ex.: DLQ no `integration-service`).

**Cache e sessão** — **Redis** para cache e suporte a infraestrutura de sessão conforme configuração por serviço.

**Persistência** — **PostgreSQL 16** (uma instância, uma base por microsserviço); anexos de incidentes persistidos no domínio do `incident-service` (conteúdo validado na API).

**Integrações** — `integration-service`: webhooks versionados (`/api/webhooks/v1/monitoring`), entrega outbound assíncrona, logs e DLQ; demais consumo via APIs REST JWT dos microsserviços. Documentação agregada em **`api-docs`** (Swagger UI).

**Observabilidade (referência operacional)** — stack Prometheus/Grafana em `infra/observability/` para métricas e alertas em ambientes que a habilitem.

## 5.2.1 Frontend

A interface da **Plataforma de Gestão de Incidentes Corporativos (PGIC)** é uma **SPA** construída com **React 18** e **TypeScript**, empacotada com **Vite 5**. O roteamento client-side usa **React Router DOM** (v6); não há framework de UI externo — o layout e os estilos são definidos em CSS próprio do pacote `packages/frontend`.

A comunicação com o backend passa pelo **BFF** (Backend for Frontend), não diretamente pelos microsserviços. O frontend chama rotas relativas como `/incidents/api/...`, `/request/api/...` e `/auth/me`; o BFF injeta o token JWT (cookie `httpOnly`) e faz proxy para o serviço correto. Em desenvolvimento, o fluxo recomendado é acessar a aplicação pelo endereço do **BFF** (porta configurável em `BFF_PORT`), que também encaminha o hot reload do Vite.

O estado de autenticação fica centralizado em **`auth-context.tsx`**: validação de sessão (`/auth/me`), login/registo com senha e início do fluxo **OAuth2 com Google** (`/auth/google`). Os módulos de negócio são componentes por área: `IncidentSection`, `ServiceRequestSection`, `ProblemSection`, `ChangeSection` e páginas agregadas (`DashboardHome`, `SystemPage`).

A estrutura do código em `packages/frontend/src/` segue responsabilidade por pasta:

- `App.tsx` — rotas, shell (sidebar, topbar), dashboard e página de sistema.
- `api/` — clientes HTTP (`http.ts`, `incidents.ts`, `service-requests.ts`, `problem-change.ts`, `integration.ts`).
- `auth.ts` / `auth-context.tsx` — sessão e credenciais.
- `*Section.tsx` — telas dos módulos ITSM (RF-5 a RF-7).
- Testes com **Vitest** e **Testing Library** (`App.test.tsx`).

## 5.2.2 Backend

O backend é um **monorepo de microsserviços** em **TypeScript** (Node.js 18+), cada um com API **Express**, persistência **Prisma** e banco **PostgreSQL** dedicado. A orquestração local usa **pnpm workspaces**; o pacote **`@pgic/shared`** concentra middleware HTTP, DTOs de erro, validação, helpers JWT/RBAC, cache Redis e contratos de eventos RabbitMQ.

O fluxo de uma requisição autenticada na interface:

1. **Frontend** → **BFF** (`packages/bff`): cookies de sessão (`pgic_at`, `pgic_rt`), endpoints `/auth/*` e proxy `/{serviço}/api/*` com header `Authorization: Bearer`.
2. **BFF** → **microsserviço** (identity, incident, request, etc.): repassa corpo e query; renova access token via refresh quando o upstream retorna 401.
3. **Microsserviço**: middleware JWT (`requireJwtPermission` do shared), **use cases** na camada `application/`, persistência em `adapters/driven/`, HTTP em `adapters/driving/`.

**API Gateway (Nginx)** em Docker expõe os mesmos prefixos para chamadas diretas ou integrações (`/identity/`, `/incidents/`, `/request/`, etc.), com portas injetadas por variáveis de ambiente.

Microsserviços e responsabilidades:

| Serviço | Domínio | Prefixo gateway |
|---------|---------|-----------------|
| `identity-service` | Utilizadores, JWT, OAuth, RBAC, sessões (RF-1, RF-2) | `/identity/` |
| `request-service` | Catálogo e requisições de serviço (RF-6) | `/request/` |
| `incident-service` | Incidentes (RF-5) | `/incidents/` |
| `problem-change-service` | Problemas e mudanças (RF-7) | `/problem-change/` |
| `sla-service` | Políticas e calendários de SLA (RF-8) | `/sla/` |
| `escalation-service` | Regras de escalonamento (RF-8) | `/escalation/` |
| `notification-service` | Notificações (e-mail/canais) | `/notifications/` |
| `audit-service` | Trilha de auditoria (RF-3) | `/audit/` |
| `reporting-service` | KPIs e exportação (RF-4) | `/reporting/` |
| `integration-service` | Webhooks e outbound (RF-9) | `/integration/` |
| `api-docs` | Swagger UI agregado | `/api-docs/` |

Cada serviço segue **Arquitetura Hexagonal** e **DDD light**: `domain/`, `application/use-cases/`, `adapters/driving/http`, `adapters/driven/persistence`. Efeitos assíncronos e integração usam **RabbitMQ** e padrão **outbox** onde implementado.

Papéis seed no `identity-service`: `admin`, `gestor`, `analista`, `noc`, `user`, com permissões no formato `module:action:scope` (ex.: `incidents:read:own`). O papel `admin` contorna checagens finas nos middlewares compatíveis.

## 5.2.3 Banco de Dados

O projeto combina **banco relacional transacional**, **cache em memória** e **mensageria**.

**Relacional:** uma instância **PostgreSQL 16** (Docker) com **uma base por microsserviço** (`identity_service`, `request_service`, `incident_service`, etc.). O esquema evolui via **migrations Prisma** em cada pacote; na raiz, `pnpm db:migrate:deploy` executa `scripts/ensure-database.ts` e aplica todas as migrations em sequência.

**Não relacional / auxiliar:**

- **Redis 7** — cache e suporte a sessão/infraestrutura conforme configuração por serviço.
- **RabbitMQ 3** — filas de eventos entre serviços (gestão em `docker-compose.yml`, UI de gestão na porta `15672` em desenvolvimento).
- Anexos de incidentes — conteúdo em base64 associado ao registo no `incident-service` (limite de tamanho e tipos MIME validados na API e no frontend).

Scripts operacionais de backup/restauro: `docs/BACKUP_RESTORE_RUNBOOK.md`.

## 5.2.4 Ferramentas de Apoio

Ferramentas que sustentam desenvolvimento, qualidade e operação, fora do runtime da aplicação:

- **Versionamento:** **Git** e **GitHub**; CI em `.github/workflows/ci.yml`.
- **Dependências:** **pnpm 9** (workspaces) e **Node.js** ≥ 18.
- **Ambiente local:** **Docker Compose** (Postgres, Redis, RabbitMQ, Nginx); `pnpm dev` orquestra infra, migrations, todos os backends, BFF, frontend e API Docs (`scripts/dev-all.ts`).
- **Qualidade:** **ESLint** e **TypeScript** strict no monorepo; testes unitários e de integração por pacote (`pnpm test`, `pnpm test:integration`); contratos OpenAPI e eventos (`pnpm test:contract`).
- **Documentação de API:** pacote **`api-docs`** com **Swagger UI Express**; especificações OpenAPI por serviço onde existem.
- **Observabilidade (referência):** stack em `infra/observability/` (Prometheus, Grafana) — ver `docs/ops/PLATFORM_OBSERVABILITY_RUNBOOK.md`.
- **Operação:** runbooks em `docs/ops/` (failover, rollback, DLQ, RTO/RPO, LGPD).

Instalação e comandos: [docs/COMO_RODAR.md](COMO_RODAR.md) e [docs/DEVELOPMENT.md](DEVELOPMENT.md).

## 5.2.5 Padrões Adotados

- **Arquitetura Hexagonal (Ports & Adapters):** domínio isolado de HTTP e Prisma; use cases orquestram regras.
- **DDD light:** entidades e value objects no domínio; eventos de domínio e consumo RabbitMQ onde aplicável.
- **Microsserviços por bounded context:** um banco Postgres por serviço; comunicação síncrona via HTTP e assíncrona via mensagens.
- **BFF:** agrega autenticação por cookie, refresh de token e proxy único para o SPA.
- **RBAC:** permissões no JWT (`perms`); enforcement com `requireJwtPermission` / escopo `read:own` em incident, request e problem-change (matriz em `docs/RBAC_MATRIZ_FLUXOS_PRINCIPAIS.md`).
- **DTOs e erros padronizados:** `@pgic/shared` (`ErrorResponseDto`, `sendValidationError`, `AppError`).
- **Outbox / DLQ:** integrações com retry e fila de mensagens mortas reprocessáveis (`integration-service`).
- **Repository implícito:** adaptadores Prisma implementam portas definidas no domínio, sem camada repository genérica compartilhada.

Convenções de pastas por serviço: `src/domain/`, `src/application/use-cases/`, `src/adapters/driving/http/`, `src/adapters/driven/persistence/`. Documentação de microsserviços: [docs/MICROSERVICES.md](MICROSERVICES.md).

## 5.2.6 Boas Práticas e Convenções

### SOLID

O monorepo aplica vários princípios SOLID de forma explícita na camada de aplicação e infraestrutura.

**DIP (Inversão de Dependência):** os casos de uso dependem de **portas** (interfaces), não de Prisma ou Express. Exemplo no `incident-service`: `ListIncidentsUseCase` recebe `IIncidentRepository` no construtor e chama apenas `this.incidentRepository.list(filters)` — a implementação concreta `PrismaIncidentRepository` fica em `adapters/driven/persistence/` e é ligada no `container.ts` via **Awilix**. O domínio e a aplicação não importam o cliente Prisma gerado.

No `identity-service`, o mesmo padrão aparece em `IPasswordHasher`: o `LoginUseCase` usa a porta `hash`/`verify`; a implementação **Argon2** (`Argon2PasswordHasher`) pode ser substituída sem alterar a regra de login (ver apêndice: `packages/identity-service/src/application/ports/password-hasher.port.ts` e `login.use-case.ts`).

**SRP (Responsabilidade Única):** cada use case encapsula uma operação (ex.: `CreateIncidentUseCase`, `ChangeIncidentStatusUseCase`); controllers HTTP apenas validam entrada, checam RBAC/escopo e delegam.

**OCP (Aberto/Fechado):** novos erros de aplicação são mapeados para HTTP adicionando entradas ao mapper (`mapApplicationErrorToHttp` + `createErrorToHttpMapper` do shared), sem alterar o middleware global.

### Clean Code

- **Nomes significativos:** classes e ficheiros refletem intenção (`HandleIntegrationIncidentIngestUseCase`, `RabbitMqIntegrationIngestConsumer`, `requireJwtPermission`).
- **Funções pequenas:** controllers usam `asyncHandler`; use cases mantêm `execute` focado; helpers isolados (ex.: `parseStatusFilter` no `IncidentController`).
- **Código autodocumentado:** comentários reservados a decisões não óbvias (ex.: documentação da porta `IPasswordHasher` sobre troca de algoritmo); evita-se comentar o que o TypeScript já expressa.

### DTOs (Data Transfer Objects)

A comunicação entre HTTP e aplicação usa **DTOs** em `application/dtos/` (ex.: `CreateIncidentDto`, `ChangeIncidentStatusDto`, `RegisterDto` no identity). O controller converte `req.body` no DTO e passa ao use case; a resposta expõe entidades de domínio ou vistas já filtradas, **sem** devolver modelos Prisma ou linhas de tabela crus. Isso evita acoplamento da API ao esquema físico e permite evoluir colunas internas sem quebrar contratos públicos.

### Tratamento de erros e exceções

- **Middleware global:** `createErrorHandlerMiddleware` / `errorHandlerMiddleware` em `@pgic/shared` captura exceções após as rotas; regista em log (Pino) com `requestId` e **não envia stack trace** ao cliente em produção.
- **Mapeamento por serviço:** cada microsserviço pode registar `mapApplicationErrorToHttp` (ex.: `IncidentNotFoundError` → 404, `IncidentForbiddenError` → 403).
- **Resposta ao cliente:** corpo padronizado `{ "error": "mensagem amigável" }` via `sendError` / `ErrorResponseDto`.
- **Validação:** `sendValidationError` para erros de campo (422) quando aplicável.
- **BFF/frontend:** mensagens genéricas (“Authentication failed”, “Unauthenticated”); detalhes técnicos ficam nos logs do serviço.

### Versionamento semântico

- O pacote raiz declara `"version": "1.0.0"` em `package.json`; releases podem seguir **SemVer** com tags Git (`v1.0.0`, `v1.1.0`).
- Histórico e integração contínua via **Git** e **GitHub** (workflow `ci.yml`).
- Recomenda-se mensagens de commit claras e descritivas (o repositório não impõe Commitlint/Husky; a equipa pode adotar **Conventional Commits** por convenção).

### Padrão de resposta de API

| Situação | Formato |
|----------|---------|
| Erro | `{ "error": string }` — `ErrorResponseDto` |
| Sucesso (recurso) | JSON do recurso ou lista (sem envelope obrigatório `data`) |
| Health | `{ "status": "ok", "service": "nome-do-serviço" }` — `HealthResponseDto` |
| Autenticação (identity/BFF) | Utilizador ou `{ "message": "..." }` em falhas do BFF |

Não há envelope universal `{ data, error, message }` em todos os endpoints; a consistência está nos **códigos HTTP**, no contrato de erro e nas especificações **OpenAPI** agregadas no `api-docs`.

### Injeção de dependência

Resolução principal via **Awilix** (`createContainer` em `packages/incident-service/src/container.ts`, equivalente nos demais serviços): registos `asFunction` / `asValue`, singletons para Prisma, repositórios, use cases e controllers. O arranque do Express obtém o cradle e monta rotas já com dependências injetadas — não há `new` espalhado nos controllers.

### Mapeamento de objetos

Conversão **manual** e localizada:

- **Entrada:** body HTTP → DTO tipado no controller.
- **Persistência:** DTO/input de repositório → modelo Prisma no adapter (`PrismaIncidentRepository`).
- **Saída:** entidade de domínio serializada em JSON no controller ou mapper dedicado (`error-to-http.mapper.ts`).
- Não se usa biblioteca global tipo AutoMapper; o mapeamento explícito mantém rastreabilidade em code review.

### Segurança básica

- **Variáveis de ambiente** (`.env` na raiz, `.env.example` versionado): `JWT_SECRET`, URLs de base de dados, `INTEGRATION_WEBHOOK_API_KEY`, credenciais SMTP, etc. — **nunca** commitar segredos.
- **Senhas:** hash com **Argon2** (`Argon2PasswordHasher`); texto plano não é persistido.
- **JWT:** HS256 com expiração e refresh; permissões em claim `perms`.
- **Webhooks:** `X-API-Key` obrigatória; **HMAC-SHA256** opcional via `X-Signature` quando `INTEGRATION_WEBHOOK_SECRET` está definida.
- **Transporte:** HTTPS em produção (BFF com cookies `Secure` conforme `x-forwarded-proto` / `BFF_COOKIE_SECURE`).
- **LGPD:** scripts de anonimização e runbook em `docs/LGPD_OPERACIONAL_RUNBOOK.md`.

## 5.2.7 Requisitos de Infraestrutura

### Produção (referência)

Ambiente típico para operar o PGIC completo (microsserviços + BFF + gateway):

| Recurso | Especificação sugerida |
|---------|------------------------|
| SO | **Linux** (ex.: Ubuntu 22.04/24.04 LTS) |
| Compute | **4+ vCPUs**, **8–16 GB RAM**, **40+ GB SSD** (múltiplos processos Node + Postgres + Redis + RabbitMQ) |
| Runtime | **Node.js 18+**, **pnpm 9** |
| Proxy / gateway | **Nginx** (API Gateway + TLS termination) |
| Banco | **PostgreSQL 16** (uma base por microsserviço ou instâncias segregadas conforme política) |
| Cache | **Redis 7** |
| Mensageria | **RabbitMQ 3** (management plugin para operação) |
| Observabilidade | **Prometheus** + **Grafana** (`infra/observability/`) |
| Rede | **HTTPS** obrigatório; cookies de sessão com `Secure` no BFF |
| E-mail | SMTP transacional (ex.: Brevo) para notificações e recuperação de senha — ver `docs/ops/EMAIL_PROVIDER_DECISION.md` |
| Segredos | Secret manager ou variáveis injetadas no deploy (não no repositório) |

Cada microsserviço pode correr em processo/container separado; o BFF e o frontend estático (build Vite) ficam atrás do Nginx. Backup/restore: `docs/BACKUP_RESTORE_RUNBOOK.md`.

### Desenvolvimento

| Requisito | Detalhe |
|-----------|---------|
| SO | **WSL2**, **macOS** ou **Linux** |
| Node | **18+**, **pnpm 9** |
| Git | Controle de versão |
| Docker | **Recomendado** — `docker compose` sobe Postgres, Redis, RabbitMQ e Nginx (`docker-compose.yml`) |
| RAM | **8 GB** confortável para `pnpm dev` (todos os serviços + Vite + BFF) |
| Comando único | Na raiz: `pnpm dev` (infra + migrations + backends + api-docs + frontend + BFF) |

Alternativa: subir só infra com `pnpm docker:up` e serviços isolados (`pnpm dev:incident`, etc.). Detalhes de portas: [docs/DEVELOPMENT.md](DEVELOPMENT.md) e [docs/COMO_RODAR.md](COMO_RODAR.md).

## 5.2.8 APIs e Integrações

Componentes e integrações previstos no PGIC (domínio ITSM corporativo):

| Componente | Função na plataforma |
|------------|----------------------|
| **identity-service** | Autenticação JWT, OAuth2 Google, RBAC, sessões, recuperação de senha |
| **integration-service** | Webhooks de monitoramento, outbound HTTP, logs, DLQ |
| **notification-service** | E-mail (SMTP) e eventos de notificação |
| **audit-service** | Trilha de auditoria de ações |
| **reporting-service** | KPIs e exportação CSV |
| **sla-service** / **escalation-service** | Políticas de SLA, calendários e escalonamento |
| **Redis** | Cache e suporte a sessão/infraestrutura |
| **RabbitMQ** | Eventos entre serviços, outbox, consumidores (ex.: criação de incidente, réplica de utilizador) |
| **PostgreSQL** | Persistência transacional por microsserviço |
| **api-docs** | Swagger UI com contratos OpenAPI |

**Não fazem parte do escopo atual:** FHIR/RNDS, SFU de vídeo (mediasoup), Web Push, assinatura ICP-Brasil ou armazenamento S3 de prontuário — o PGIC concentra-se em incidentes, requisições, problemas, mudanças e integrações operacionais.

### Endpoints de integração relevantes

- `POST /api/webhooks/v1/monitoring` — ingestão de alertas (`X-API-Key`, HMAC opcional).
- `POST /api/outbound/v1/deliver` — disparo outbound assíncrono com retry/DLQ (JWT).
- `GET /api/integration-logs`, `GET /api/integration-dlq`, `POST /api/integration-dlq/:id/reprocess` — operação e reprocessamento.

### Fluxo: alerta de monitoramento → incidente

1. Ferramenta de monitoramento (Zabbix, Prometheus Alertmanager, etc.) envia **POST** ao webhook com `externalId`, título, severidade e serviço afetado.
2. `integration-service` valida chave/HMAC, regista log, grava evento na **outbox**.
3. Relay publica em **RabbitMQ** (`integration.events` / `incident_ingest`).
4. `incident-service` consome `incident.integration_ingest`, cria incidente de forma **idempotente** (`externalSource` + `externalId`).
5. Operador acompanha o incidente na UI (**Incidentes** / **Dashboard**); SLA e escalonamento podem reagir via eventos nos respetivos serviços.

### Fluxo: requisição de serviço com aprovação

1. Utilizador escolhe item do **catálogo** e cria pedido no `request-service`.
2. **Submete** para aprovação; evento pode notificar aprovadores (`notification-service`).
3. **Gestor/analista** aprova ou rejeita (`requests:approve:all`).
4. Equipa **inicia** e **conclui** o atendimento; estado final reflete-se no dashboard.

### Fluxo: utilizador criado → réplica nos serviços

1. Registo ou criação no `identity-service` publica evento **user.created**.
2. Consumidores (ex.: `incident-service`) atualizam loja local de utilizadores para atribuição e filtros sem chamada síncrona ao identity em cada leitura.

### Fluxo: outbound com falha e DLQ

1. Sistema enfileira entrega HTTP via `POST /api/outbound/v1/deliver`.
2. Relay tenta envio com timeout e **retry** até `maxAttempts`.
3. Após esgotar tentativas, mensagem vai para **DLQ**; operador reprocessa pela UI (**Sistema** → DLQ) ou API `reprocess`.

### Fluxo: notificação por e-mail

1. Evento de domínio (ex.: requisição submetida, incidente crítico) chega ao `notification-service` via fila.
2. Serviço envia e-mail por **SMTP** (credenciais em `.env`); falhas registadas para retry operacional.

Documentação detalhada: `packages/integration-service/README.md`, [docs/API_VERSIONING_POLICY.md](API_VERSIONING_POLICY.md), [docs/ops/MESSAGING_RETRY_DLQ_POLICY.md](ops/MESSAGING_RETRY_DLQ_POLICY.md).

## 5.2.9 Caracterização da API

A plataforma expõe **três perfis de consumo**:

**Interface web (SPA + BFF):** o React consome JSON via rotas proxied (`/incidents/api/...`, `/request/api/...`). Autenticação por **cookies httpOnly** geridos pelo BFF (access + refresh); o BFF traduz para **Bearer JWT** nos microsserviços. Não há envelope JSON global — cada endpoint retorna o recurso ou erro (`message`, status HTTP).

**APIs REST dos microsserviços:** cada serviço expõe rotas sob `/api/...` (health em `/health`). Prefixos no gateway Nginx ou no BFF (`/identity`, `/incidents`, etc.). Autenticação **JWT HS256** com claims de utilizador e lista `perms`. Respostas **401** sem token válido; **403** sem permissão ou escopo (`read:own`).

**Integrações externas (integration-service):**

- **Inbound:** `POST /api/webhooks/v1/monitoring` — autenticação por `X-API-Key` (HMAC opcional); ingestão de alertas de monitoramento.
- **Outbound:** `POST /api/outbound/v1/deliver` — JWT; envio assíncrono com retry/DLQ.
- Consulta operacional: `GET /api/integration-logs`, `GET /api/integration-dlq`, `POST /api/integration-dlq/:id/reprocess`.

**Versionamento:** política em [docs/API_VERSIONING_POLICY.md](API_VERSIONING_POLICY.md) — endpoints novos preferem path `/v1/...`; integração já usa `/api/webhooks/v1/` e `/api/outbound/v1/`. Documentação OpenAPI agregada no serviço **api-docs** (porta `API_DOCS_PORT`).

Não há **GraphQL**. Tempo real entre serviços baseia-se em **eventos RabbitMQ**, não em WebSocket na UI atual.

---

# 6 MANUAL DO USUÁRIO

## 6.1 Apresentação

A **Plataforma de Gestão de Incidentes Corporativos (PGIC)** é uma aplicação web para operação **ITSM**: registo e acompanhamento de **incidentes**, **requisições de serviço** (catálogo e aprovações), **problemas** recorrentes, **mudanças** (change management), indicadores no **dashboard** e funções de **sistema** (saúde dos serviços, integrações, exportação de relatórios).

O acesso é controlado por **papéis** (RBAC): `user` (utilizador final), `noc`, `analista`, `gestor` e `admin`. O menu lateral é comum após o login; botões e listagens respeitam as permissões do seu papel — mensagens como “Sem permissão” indicam que precisa de outro perfil ou de intervenção do administrador.

Este manual descreve as tarefas mais comuns na interface atual. Recomenda-se complementar com **capturas de tela** no documento final (PDF), destacando botões e campos relevantes.

## 6.2 Requisitos para usar o sistema

- Navegador atualizado: **Chrome**, **Firefox**, **Edge** ou **Safari**, com JavaScript habilitado.
- Conexão estável com a internet (ou rede corporativa onde a plataforma está publicada).
- Resolução recomendada: mínimo **1024×768**; ideal **1366×768** ou superior.
- Para anexos em incidentes: ficheiros até **1 MB**, tipos **PNG**, **JPEG**, **PDF** ou **texto simples**.

## 6.3 Acesso, cadastro e senha

### 6.3.1 Entrar no sistema

1. Abra o endereço da plataforma no navegador (em desenvolvimento, preferencialmente a URL do **BFF**, ex.: `http://localhost:3100`).
2. Será redirecionado para **Entrar** se não houver sessão ativa.
3. Informe **e-mail ou login** e **senha** (mínimo 8 caracteres).
4. Clique em **Entrar**. O sistema abre o **Dashboard**.

Alternativa: clique em **Continuar com Google** para autenticação OAuth2 (requer configuração do provedor no ambiente).

### 6.3.2 Primeiro acesso — registo

1. Na tela de login, clique em **Registrar** (link “Primeiro acesso?”).
2. Preencha **nome completo**, **e-mail**, **senha** e, se desejar, **login**, **departamento** e **cargo**.
3. Clique em **Registrar e entrar**. O perfil inicial costuma ser **`user`**; o administrador pode alterar o papel depois.
4. Após o registo, acede automaticamente ao **Dashboard**.

### 6.3.3 Sair do sistema

1. No canto superior da área autenticada, clique em **Sair**.
2. A sessão é encerrada e volta à tela de **Entrar**.

### 6.3.4 Recuperação de senha

A recuperação de senha está implementada no **identity-service** (e-mail com link/código). Se a sua instalação ainda não expuser o fluxo na interface, solicite redefinição ao **administrador** ou utilize os endpoints de recuperação documentados na API de identidade.

## 6.4 Dashboard — visão operacional

Após o login, o menu lateral inclui: **Dashboard**, **Incidentes**, **Requisições**, **Problemas**, **Mudanças** e **Sistema**.

Na **Dashboard**:

1. Veja indicadores: **incidentes abertos**, **em risco de SLA** (heurística: abertos há mais de 4 horas), **concluídos no período** e **requisições ativas**.
2. Ajuste filtros: **período** (24h, 7d, 30d), **criticidade** e **equipe**.
3. Consulte tabelas de **incidentes recentes** e **requisições recentes** (conforme permissão de leitura).
4. Use **Atualizar** para recarregar os dados.

Se aparecer “Sem permissão ou serviços indisponíveis”, confirme o seu papel ou contacte o suporte — alguns indicadores dependem de acesso a incidentes e requisições.

## 6.5 Gestão de incidentes

Menu **Incidentes** (RF-5).

### 6.5.1 Listar incidentes

1. Abra **Incidentes**.
2. A lista mostra título, estado, criticidade e equipa atribuída, conforme o seu escopo (`read:all` vê todos; `read:own` apenas os seus ou em que participa).
3. Se receber erro de permissão, peça ao administrador papel **analista**, **noc**, **gestor** ou **admin**, ou verifique se está autenticado.

### 6.5.2 Criar incidente

1. Preencha **título**, **descrição** e **criticidade** (Low, Medium, High, Critical).
2. Opcionalmente indique **equipa atribuída**.
3. Submeta o formulário de criação.
4. O novo incidente aparece na lista após atualização.

### 6.5.3 Anexos e ligação a problemas

- Por incidente, pode **anexar ficheiro** (tipos e tamanho limitados) e **associar a um problema** existente no catálogo, ou **criar problema** a partir do fluxo da linha.
- Use as ações na linha do incidente (anexo, ligar/desligar problema) e aguarde a confirmação na interface.

### 6.5.4 Atualizar estado e comentários

Conforme permissões (`incidents:update:all` ou `update:own`), altere **estado**, **atribuição** e adicione **comentários** pelos controlos disponíveis na secção do incidente (analista/NOC/gestor).

## 6.6 Catálogo e requisições de serviço

Menu **Requisições** (RF-6).

### 6.6.1 Consultar catálogo e pedidos

1. Abra **Requisições**.
2. Veja itens do **catálogo** e a lista de **pedidos de serviço** (requisições).
3. Utilizadores com escopo próprio veem sobretudo os seus pedidos; gestores e analistas veem listagens mais amplas.

### 6.6.2 Criar e submeter requisição

1. Escolha um item do catálogo e crie um novo pedido.
2. Preencha os campos obrigatórios do formulário.
3. Use **Submeter** (ou equivalente) para enviar ao fluxo de aprovação, quando aplicável.

### 6.6.3 Aprovar, rejeitar e atender

Perfis **gestor**, **analista** ou **admin** (com `requests:approve:all`) podem:

1. Abrir o detalhe do pedido.
2. **Aprovar** ou **Rejeitar** com comentário, quando for aprovador no fluxo.
3. **Iniciar atendimento** e **Concluir** o pedido nas fases operacionais seguintes.

Utilizadores finais (`user`) normalmente criam e acompanham os próprios pedidos até conclusão ou cancelamento.

## 6.7 Problemas e mudanças

### 6.7.1 Problemas (RF-7.1–RF-7.2)

Menu **Problemas**:

1. Liste problemas registados (escopo global ou próprio, conforme papel).
2. Crie ou edite problemas com título, descrição e metadados exigidos.
3. Consulte **versões** do problema quando o sistema mantiver histórico versionado.
4. Na área de **Incidentes**, associe incidentes a problemas já existentes.

### 6.7.2 Mudanças — Change management (RF-7.3)

Menu **Mudanças**:

1. Registe uma **mudança** planificada (campos do formulário na secção).
2. Acompanhe estado e versões na lista.
3. Aprovações de mudança dependem de permissões `changes:approve:all` (tipicamente **gestor** ou **admin**).

## 6.8 Área de sistema (gestão e integrações)

Menu **Sistema** — voltado a operação e perfis com acesso a integrações/relatórios.

### 6.8.1 Saúde dos serviços

1. Abra **Sistema**.
2. Verifique os cartões de **saúde** (BFF, Identity, Incidents, Requests, SLA, Escalation, Notifications, Audit, Reporting, Integration): **OK** ou **Falha**.

### 6.8.2 Integrações, logs e DLQ

1. Na mesma página, consulte **Logs de integração** (direção, status HTTP, endpoint).
2. Na secção **DLQ de integração**, veja eventos falhados e use **Reprocessar** em itens pendentes (requer permissão no `integration-service`).
3. Clique em **Atualizar** para recarregar logs e DLQ.

### 6.8.3 Exportação de relatórios

Use o link **Exportar relatórios CSV** (serviço de reporting) para obter definições/exportação quando o seu papel permitir (`reporting:export:all` — típico de **gestor**/**admin**).

Áreas como **auditoria**, **SLA** e **escalonamento** são expostas principalmente via API e documentação Swagger; a UI de sistema indica a disponibilidade desses módulos.

## 6.9 Papéis e o que cada um costuma fazer

| Papel | Uso típico na interface |
|-------|-------------------------|
| **user** | Abrir incidentes e requisições próprias; acompanhar dashboard com escopo limitado. |
| **noc** | Monitorizar e tratar incidentes (leitura/atualização ampla de incidentes). |
| **analista** | Operação ITSM completa em incidentes, pedidos, problemas e mudanças (exceto gestão de settings). |
| **gestor** | Aprovar requisições e mudanças; exportar relatórios; visão ampla de leitura. |
| **admin** | Acesso total; gestão de utilizadores e permissões via API/ferramentas administrativas. |

O papel activo aparece no chip ao lado do nome no topo da aplicação (ex.: `user`, `gestor`).

## 6.10 Glossário de mensagens comuns

- **Sem permissão para listar…:** o seu JWT não inclui a permissão necessária; contacte o administrador ou faça login com outra conta.
- **Sessão expirada ou não autenticado:** faça login novamente; o BFF renova o token automaticamente quando possível.
- **Sem permissão ou serviços indisponíveis:** falha ao carregar dashboard — verifique rede, `pnpm dev` completo ou saúde em **Sistema**.
- **Não foi possível registar / entrar:** credenciais inválidas, e-mail duplicado ou serviço de identidade indisponível.
- **OAuth callback inválido:** fluxo Google interrompido; tente de novo ou use login por senha.
- **Item reenfileirado na outbox:** reprocessamento DLQ concluído com sucesso.
- **Campos obrigatórios:** preencha título, descrição e demais campos marcados antes de submeter.

## 6.11 Perguntas frequentes (FAQ)

**Qual URL devo usar?** Em desenvolvimento, use o endereço do **BFF** impresso ao correr `pnpm dev` (cookies e proxy alinhados). O Vite isolado (`5173`) não é o fluxo completo de autenticação.

**Não consigo ver todos os incidentes.** Utilizadores `user` têm escopo **own**; NOC, analista, gestor e admin têm leitura mais ampla.

**Como aprovo uma requisição?** É necessário papel com permissão de aprovação (**gestor**, **analista** ou **admin**) e ser aprovador válido no fluxo do pedido.

**O que é “em risco de SLA” no dashboard?** Indicador operacional: incidentes ainda abertos criados há mais de **4 horas**; não substitui o cálculo formal do `sla-service`.

**Como integro monitoramento externo?** Via webhook `POST /api/webhooks/v1/monitoring` no `integration-service` (chave API); não é feito pela interface gráfica.

**Onde está a documentação da API?** Serviço **api-docs** (Swagger UI) na porta `API_DOCS_PORT`, também acessível pelo gateway em `/api-docs/`.

## 6.12 Primeiro acesso — resumo rápido

1. **Registrar** ou **Entrar** (senha ou Google).
2. Confirme o **Dashboard** e o seu **papel** no topo.
3. Para reportar falha: **Incidentes** → criar incidente.
4. Para pedir serviço do catálogo: **Requisições** → novo pedido → submeter.
5. Para verificar a plataforma: **Sistema** → cartões de saúde e, se autorizado, logs/DLQ.

Se alguma funcionalidade não aparecer, é provável que o seu perfil RBAC ainda não inclua essa permissão — solicite ajuste ao **administrador** da instalação.

---

# 7 REFERÊNCIAS

AMAZON WEB SERVICES. Hexagonal architecture pattern. AWS Prescriptive Guidance, 2026. Disponível em: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html. Acesso em: 2 junho 2026.

AMAZON WEB SERVICES. Transactional outbox pattern. AWS Prescriptive Guidance, 2026. Disponível em: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html. Acesso em: 2 junho 2026.

AWILIX. Awilix documentation. 2026. Disponível em: https://github.com/jeffijoe/awilix. Acesso em: 2 junho 2026.

BRASIL. Lei nº 13.709, de 14 de agosto de 2018. Lei Geral de Proteção de Dados Pessoais (LGPD). 2018. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Acesso em: 2 junho 2026.

COCKBURN, Alistair. Hexagonal architecture. alistair.cockburn.us, 2005. Disponível em: https://alistair.cockburn.us/hexagonal-architecture. Acesso em: 2 junho 2026.

CONVENTIONAL COMMITS. Conventional Commits specification. 2026. Disponível em: https://www.conventionalcommits.org. Acesso em: 2 junho 2026.

DOCKER. Docker documentation. 2026. Disponível em: https://docs.docker.com. Acesso em: 2 junho 2026.

EVANS, Eric. Domain-Driven Design: tackling complexity in the heart of software. Boston: Addison-Wesley, 2003.

EXPRESS. Express documentation. 2026. Disponível em: https://expressjs.com. Acesso em: 2 junho 2026.

FOWLER, Martin. Domain-Driven Design. martinfowler.com, 2003. Disponível em: https://martinfowler.com/bliki/DomainDrivenDesign.html. Acesso em: 2 junho 2026.

GRAFANA LABS. Grafana documentation. 2026. Disponível em: https://grafana.com/docs/grafana/latest. Acesso em: 2 junho 2026.

MARTIN, Robert C. Código limpo: habilidades práticas do software Agile. Rio de Janeiro: Alta Books, 2011.

MICROSOFT. Backends for Frontends pattern. Azure Architecture Center, 2026. Disponível em: https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends. Acesso em: 2 junho 2026.

MICROSOFT. Use tactical DDD to design microservices. Azure Architecture Center, 2026. Disponível em: https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-ddd. Acesso em: 2 junho 2026.

NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY. Role Based Access Control (RBAC). 2026. Disponível em: https://csrc.nist.gov/projects/role-based-access-control. Acesso em: 2 junho 2026.

NEWMAN, Sam. Building Microservices: designing fine-grained systems. 2. ed. Sebastopol: O'Reilly Media, 2021.

NEWMAN, Sam. Backends For Frontends. samnewman.io, 2015. Disponível em: https://samnewman.io/patterns/architectural/bff. Acesso em: 2 junho 2026.

NGINX. NGINX documentation. 2026. Disponível em: https://nginx.org/en/docs. Acesso em: 2 junho 2026.

OPENAPI INITIATIVE. OpenAPI Specification v3.0.3. 2026. Disponível em: https://spec.openapis.org/oas/v3.0.3.html. Acesso em: 2 junho 2026.

OPENJS FOUNDATION. Node.js documentation. 2026. Disponível em: https://nodejs.org/en/docs. Acesso em: 2 junho 2026.

OTRS AG. ITIL incident management – definition, benefits, and process. otrs.com, 2026. Disponível em: https://otrs.com/blog/itsm/itil-incident-management. Acesso em: 2 junho 2026.

OWASP FOUNDATION. OWASP API Security Project. 2026. Disponível em: https://owasp.org/www-project-api-security. Acesso em: 2 junho 2026.

PNPM. pnpm workspaces documentation. 2026. Disponível em: https://pnpm.io/workspaces. Acesso em: 2 junho 2026.

POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL documentation. 2026. Disponível em: https://www.postgresql.org/docs. Acesso em: 2 junho 2026.

PRISMA. PostgreSQL database connector. Prisma documentation, 2026. Disponível em: https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql. Acesso em: 2 junho 2026.

PROMETHEUS. Prometheus documentation. 2026. Disponível em: https://prometheus.io/docs/introduction/overview. Acesso em: 2 junho 2026.

RABBITMQ. RabbitMQ documentation. 2026. Disponível em: https://www.rabbitmq.com/documentation.html. Acesso em: 2 junho 2026.

REACT. React documentation. 2026. Disponível em: https://react.dev. Acesso em: 2 junho 2026.

REDIS. Redis documentation. 2026. Disponível em: https://redis.io/docs/latest. Acesso em: 2 junho 2026.

RICHARDSON, Chris. Pattern: Transactional outbox. microservices.io, 2026. Disponível em: https://microservices.io/patterns/data/transactional-outbox.html. Acesso em: 2 junho 2026.

RFC EDITOR. RFC 6749: The OAuth 2.0 Authorization Framework. 2012. Disponível em: https://www.rfc-editor.org/rfc/rfc6749. Acesso em: 2 junho 2026.

RFC EDITOR. RFC 7519: JSON Web Token (JWT). 2015. Disponível em: https://www.rfc-editor.org/rfc/rfc7519. Acesso em: 2 junho 2026.

RFC EDITOR. RFC 9106: Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications. 2021. Disponível em: https://www.rfc-editor.org/rfc/rfc9106. Acesso em: 2 junho 2026.

SEMVER. Semantic Versioning 2.0.0. 2026. Disponível em: https://semver.org/spec/v2.0.0.html. Acesso em: 2 junho 2026.

SERVICENOW. What is incident management? 2026. Disponível em: https://www.servicenow.com/products/itsm/what-is-incident-management.html. Acesso em: 2 junho 2026.

TECHTARGET. IT incident management. 2026. Disponível em: https://www.techtarget.com/searchitoperations/definition/IT-incident-management. Acesso em: 2 junho 2026.

TYPESCRIPT. TypeScript handbook. 2026. Disponível em: https://www.typescriptlang.org/docs/handbook/intro.html. Acesso em: 2 junho 2026.

VITE. Vite documentation. 2026. Disponível em: https://vite.dev. Acesso em: 2 junho 2026.

WIKIPEDIA. Incident management (ITSM). 2026. Disponível em: https://en.wikipedia.org/wiki/Incident_management_(ITSM). Acesso em: 2 junho 2026.
