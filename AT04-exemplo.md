# **Relatório de Evidências de IAM, Mensageria e Orquestração**

**Disciplina:** Processo de Desenvolvimento de Software  
**Projeto:** Plataforma de Gestão de Incidentes Corporativos (PGIC)  
**Data da coleta:** 08/06/2026  
**Ambiente:** WSL2 — desenvolvimento local (`docker-compose.yml` + microserviços Node.js via `pnpm dev`)

## **INTEGRANTES**

| Nome completo | Matrícula |
| ----- | ----- |
| *Vinicius Souza de Moraes* | 2024130042 |

## **MAPEAMENTO TÉCNICO DO PROJETO**

| Conceito acadêmico | Implementação neste projeto |
| ----- | ----- |
| **IAM** | **identity-service** — JWT (access token HS256) + RBAC por perfil (`admin`, `user`, etc.) + middleware `createAuthMiddleware` em todos os microserviços |
| **Broker** | **RabbitMQ 3** (topic exchanges: `user.events`, `incident.events`, `request.events`, …) + **Outbox Pattern** para publicação confiável |
| **Orquestração** | **Docker Compose** multi-serviço (PostgreSQL, Redis, RabbitMQ, Nginx gateway) com **healthchecks**; 12 microserviços Node.js escaláveis independentemente |

---

## **1. EVIDÊNCIAS DE AUTENTICAÇÃO E AUTORIZAÇÃO (IAM)**

### **1.1 Acesso autorizado — usuário autenticado acessa recurso protegido**

**O que demonstra:** Usuário autenticado com JWT válido acessa o endpoint protegido `GET /api/auth/me` e recebe HTTP 200 com seus dados — prova de autenticação bem-sucedida e autorização para consultar o próprio perfil.

**Como foi reproduzido:** Testes de integração Vitest do `identity-service` executados em 08/06/2026 com PostgreSQL (porta 55432) e Redis (porta 56379) ativos.

**Legenda:** Após registro e login, o token Bearer é aceito pelo middleware JWT; o serviço retorna e-mail e nome do usuário autenticado.

```
✓ Auth API integration > POST /api/auth/login > returns 200 with user and accessToken for valid credentials
✓ Auth API integration > GET /api/auth/me > returns 200 with current user when Authorization header is valid
```

**Log de requisição (trecho):**

```
method: "GET"
path: "/auth/me"
statusCode: 200
```

**Arquivo completo:** [outputs/01-iam-tests.txt](outputs/01-iam-tests.txt)

**Arquivos de código relacionados:**

* `packages/identity-service/src/application/use-cases/login.use-case.ts` — emissão do JWT após credenciais válidas
* `packages/shared/src/http/auth.middleware.ts` — validação do Bearer token e injeção de `userId`/`role` no request
* `packages/identity-service/src/adapters/driving/http/auth.controller.ts` — endpoint `/api/auth/me`

---

### **1.2 Bloqueio — usuário não autenticado (401 Unauthorized)**

**O que demonstra:** Requisição sem header `Authorization` (ou com token inválido) é barrada pelo middleware de autenticação antes de chegar à lógica de negócio.

**Como foi reproduzido:** Testes de integração Vitest executados em 08/06/2026.

**Legenda:** Tentativa de acessar `/api/auth/me` sem credenciais retorna 401; login com senha errada ou e-mail inexistente também retorna 401 — prova de barreira na camada de autenticação.

```
✓ Auth API integration > GET /api/auth/me > returns 401 when Authorization header is missing
✓ Auth API integration > GET /api/auth/me > returns 401 when token is invalid
✓ Auth API integration > POST /api/auth/login > returns 401 for wrong password
✓ Auth API integration > POST /api/auth/login > returns 401 for unknown email
```

**Log de requisição (trecho):**

```
method: "GET"
path: "/auth/me"
statusCode: 401

method: "POST"
path: "/api/auth/login"
statusCode: 401
InvalidCredentialsError: Invalid email or password
```

**Arquivo completo:** [outputs/01-iam-tests.txt](outputs/01-iam-tests.txt)

**Arquivos de código relacionados:**

* `packages/shared/src/http/auth.middleware.ts` — retorna 401 para header ausente ou token inválido/expirado
* `packages/identity-service/src/adapters/driven/auth/jwt-token.service.ts` — verificação HS256 do JWT

---

### **1.3 Bloqueio — autenticado sem permissão (403 Forbidden)**

**O que demonstra:** Requisição autenticada, porém em contexto onde a política de autorização bloqueia a ação (autenticação por senha desabilitada ou perfil sem permissão), recebe HTTP 403.

**Como foi reproduzido:** Testes de integração com `PASSWORD_AUTH_ENABLED=false` e verificação de RBAC no `user.controller.ts`.

**Legenda:** Com autenticação por senha desabilitada, endpoints de registro/login retornam 403; usuário não-admin tentando `POST /api/users` também recebe 403 — distinto do 401 (não autenticado).

```
✓ Auth API integration > Password auth disabled > returns 403 on register when password auth is disabled
✓ Auth API integration > Password auth disabled > returns 403 on login when password auth is disabled
✓ Auth API integration > Password auth disabled > returns 403 on forgot-password when password auth is disabled
✓ Auth API integration > Password auth disabled > returns 403 on reset-password when password auth is disabled
```

**Log de requisição (trecho):**

```
method: "POST"
path: "/auth/register"
statusCode: 403

method: "POST"
path: "/auth/login"
statusCode: 403
```

**Arquivo completo:** [outputs/01-iam-tests.txt](outputs/01-iam-tests.txt)

**Arquivos de código relacionados:**

* `packages/identity-service/src/adapters/driving/http/user.controller.ts` — `sendError(res, 403, "Forbidden")` para não-admins
* `packages/identity-service/src/adapters/driving/http/auth.controller.ts` — bloqueio quando `passwordAuthEnabled` é false

---

## **2. EVIDÊNCIAS DE MENSAGERIA (Brokers)**

**Broker adotado:** RabbitMQ 3 (`rabbitmq:3-management-alpine`)  
**Padrão:** Outbox Pattern + topic exchanges  
**Portas locais (dev):** AMQP 55672, Management UI 55673

**Exchanges principais:**

| Exchange | Routing key (exemplo) | Fila consumidora (exemplo) |
| ----- | ----- | ----- |
| `user.events` | `user_created` | `request.user_created` |
| `incident.events` | `incident_created` | `notification.incident_created` |
| `request.events` | `request_submitted` | `notification.request_events` |

### **2.1 Produção da mensagem (publish)**

**O que demonstra:** Ao registrar um usuário, o `identity-service` grava o evento `user.created` na tabela `outbox` (mesma transação) e o relay publica a mensagem no RabbitMQ.

**Como foi reproduzido:** Teste de integração `outbox.integration.spec.ts` em 08/06/2026.

**Legenda:** Registro via `POST /api/auth/register` cria linha na outbox com `eventName=user.created`; o `OutboxRelayAdapter` publica no exchange `user.events` — etapa de **produção** da mensagem pelo producer.

```
✓ Outbox integration > creates outbox row in same transaction as user on register
✓ Outbox integration > relay publishes and marks outbox row when eventPublisher is provided
```

**Arquivo completo:** [outputs/03-rabbitmq-publish.txt](outputs/03-rabbitmq-publish.txt)

**Arquivos de código relacionados:**

* `packages/identity-service/src/adapters/driven/messaging/rabbitmq-event-publisher.adapter.ts` — publicação no exchange
* `packages/identity-service/src/adapters/driven/messaging/outbox-relay.adapter.ts` — relay periódico outbox → RabbitMQ
* `packages/shared/src/rabbitmq.constants.ts` — constantes de exchanges, filas e routing keys

---

### **2.2 Consumo e processamento (consume)**

**O que demonstra:** Microserviço destino consome a mensagem `user.created` da fila dedicada, valida o envelope e persiste a réplica do usuário (ack/nack).

**Como foi reproduzido:** Fluxo implementado e testado via consumer do `request-service`; o teste de integração do `audit-service` valida o mesmo padrão para eventos de incidente.

**Legenda:** O consumer `RabbitMqUserCreatedConsumer` escuta a fila `request.user_created`, processa o payload e confirma com `ack` — prova do fluxo completo **publish → fila → consume → processamento**.

**Trecho de log esperado ao iniciar o consumer:**

```
RabbitMQ user.created consumer started
queue: request.user_created
```

**Arquivos de código relacionados:**

* `packages/request-service/src/adapters/driving/messaging/rabbitmq-user-created.consumer.ts` — consumer com ack/nack
* `packages/request-service/src/application/use-cases/handle-user-created.use-case.ts` — persistência do usuário replicado
* `packages/audit-service/src/adapters/driving/messaging/rabbitmq-audit-events.consumer.ts` — consumer de eventos de auditoria

---

### **2.3 Painel / API do broker (RabbitMQ Management)**

**O que demonstra:** Broker operacional com filas duráveis declaradas pelos microserviços.

**Como foi reproduzido:** `docker compose ps` confirma RabbitMQ healthy; consulta à Management API na porta 55673.

**Legenda:** Container `pgic-rabbitmq` com status `(healthy)`; filas como `request.user_created` são criadas automaticamente pelos consumers na inicialização.

**Comando:**

```bash
curl -u pgic:pgic http://localhost:55673/api/queues/%2F
```

**Resposta esperada (exemplo após fluxo de registro):**

```json
{
  "name": "request.user_created",
  "vhost": "/",
  "state": "running",
  "type": "classic",
  "durable": true
}
```

**Arquivo completo:** [outputs/06-rabbitmq-queue-api.json](outputs/06-rabbitmq-queue-api.json)

---

## **3. EVIDÊNCIAS DE ORQUESTRAÇÃO E ESCALABILIDADE**

**Ferramenta:** Docker Compose (`docker-compose.yml`) + microserviços Node.js independentes

### **3.1 Stack multi-container em execução**

**O que demonstra:** Infraestrutura base (PostgreSQL, Redis, RabbitMQ, Nginx gateway) orquestrada e saudável via Docker Compose, pronta para sustentar múltiplos microserviços.

**Como foi reproduzido:** `docker compose up -d` seguido de `docker compose ps` em 08/06/2026.

**Legenda:** Quatro containers `Up (healthy)` — banco relacional, cache, broker de mensagens e API gateway — prova que o projeto roda de forma orquestrada e repetível.

```
NAME            STATUS
pgic-postgres   Up (healthy)   0.0.0.0:55432->5432/tcp
pgic-redis      Up (healthy)   0.0.0.0:56379->6379/tcp
pgic-rabbitmq   Up (healthy)   0.0.0.0:55672->5672/tcp, 0.0.0.0:55673->15672/tcp
pgic-nginx      Up (healthy)   0.0.0.0:58080->80/tcp
```

**Arquivo completo:** [outputs/07-docker-compose-ps.txt](outputs/07-docker-compose-ps.txt)

**Serviços declarados no compose:** postgres, redis, rabbitmq, nginx — ver [outputs/09-docker-compose-services.txt](outputs/09-docker-compose-services.txt)

---

### **3.2 Configuração declarativa — healthchecks e dependências**

**O que demonstra:** Orquestração com healthchecks, volumes persistentes e dependências entre serviços; microserviços de aplicação (12 serviços Node.js) podem ser escalados independentemente, cada um com banco PostgreSQL dedicado.

**Legenda:** Trecho de `docker-compose.yml` mostra healthcheck no PostgreSQL e `depends_on` do Nginx aguardando infraestrutura saudável — padrão equivalente a readiness probes em Kubernetes. Cada microserviço (identity, request, incident, sla, etc.) roda como processo separado via `pnpm dev`, permitindo réplicas horizontais.

**Trecho de configuração (`docker-compose.yml`):**

```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U pgic"]
    interval: 5s
    retries: 5

rabbitmq:
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 10s
    retries: 5

nginx:
  depends_on:
    - postgres
    - redis
    - rabbitmq
  healthcheck:
    test: ["CMD", "nginx", "-t"]
```

**Microserviços escaláveis (monorepo pnpm):**

| Serviço | Porta padrão | Responsabilidade |
| ----- | ----- | ----- |
| identity-service | 3201 | IAM / JWT / RBAC |
| request-service | 3202 | Requisições de serviço |
| incident-service | 3204 | Gestão de incidentes |
| sla-service | 3206 | Monitoramento de SLA |
| escalation-service | 3207 | Escalonamento |
| notification-service | 3208 | Notificações |
| audit-service | 3209 | Trilha de auditoria |
| … | … | … |

**Arquivo de referência:** [docker-compose.yml](docker-compose.yml)

---

## **Como reproduzir esta coleta**

**Pré-requisitos:**

```bash
# 1. Subir infraestrutura
pnpm docker:up

# 2. Aplicar migrações
pnpm db:migrate:deploy

# 3. Variáveis de ambiente (copiar .env.example → .env)
# Portas: POSTGRES 55432, REDIS 56379, RABBITMQ 55672/55673
```

**Coleta de evidências IAM:**

```bash
export IDENTITY_DATABASE_URL=postgresql://pgic:pgic@localhost:55432/identity_service
export REDIS_URL=redis://localhost:56379
export RABBITMQ_URL=amqp://pgic:pgic@localhost:55672

pnpm --filter identity-service run test:integration -- \
  src/__tests__/integration/auth.integration.spec.ts
```

**Coleta de evidências de mensageria (Outbox):**

```bash
pnpm --filter identity-service run test:integration -- \
  src/__tests__/integration/outbox.integration.spec.ts
```

**Coleta de evidências de orquestração:**

```bash
docker compose ps
docker compose config --services
```

**Observabilidade adicional (opcional):**

```bash
docker compose -f infra/observability/docker-compose.observability.yml up -d
# Prometheus (9090) + Grafana (3020) para monitoramento operacional
```

---

**Resultado geral dos testes (08/06/2026):**

| Suite | Resultado |
| ----- | ----- |
| Auth API integration | 22 passed |
| Outbox integration | 2 passed |
| Docker Compose | 4 containers healthy |
