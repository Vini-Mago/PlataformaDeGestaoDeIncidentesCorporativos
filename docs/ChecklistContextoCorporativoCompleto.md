# PGIC — Contexto completo e checklist corporativo (alinhamento ao RequisitosCorp)

Este documento consolida o **intuito estratégico** da **Plataforma de Gestão de Incidentes Corporativos (PGIC)** com o quadro de referência corporativo definido em **RequisitosCorp.md**, complementado por **AnaliseRequisitos.md**, **visãogeral.md**, **PensamentoInicial.md**, **MICROSERVICES.md** e **MICROSERVICES_LIST.md**. Serve como mapa mental único: o que o projeto é, por que é “corporativo”, quais capacidades ITSM ele cobre e como cada bloco do **RequisitosCorp** encontra correspondência no domínio PGIC e nos artefatos do repositório.

**Como usar:** os itens marcados com `[ ]` são verificáveis (implementação, configuração, teste ou evidência em produção). Itens com `[~]` podem significar “parcialmente atendido”, “documentado mas não implantado” ou “depende de ambiente”. Ajuste os marcadores conforme o estado real do seu deployment.

**Última revisão dos marcadores neste ficheiro (inspeção do código e da infra local do monorepo PGIC):** 2026-05-20. `[x]` indica evidência no repositório; `[~]` indica implementação parcial, só em desenvolvimento ou dependente de política/ambiente; `[ ]` mantém-se quando não há suporte no código atual (ex.: HA em produção, saída ERP).

---

## 1. Sumário executivo — o que é o PGIC e qual problema resolve

### 1.1 Propósito do produto

A PGIC é uma plataforma **ITSM-like** (gestão de serviços de TI no sentido amplo): centraliza o ciclo de vida de **incidentes**, **requisições de serviço**, **problemas**, **mudanças**, **SLA**, **escalonamento**, **auditoria** e **indicadores**, para organizações que não podem depender de planilhas informais ou de ferramentas desconectadas.

**Objetivos de alto nível** (síntese de *visãogeral.md* e *PensamentoInicial.md*):

- **Centralizar** abertura, tratamento, acompanhamento e encerramento de chamados e mudanças.
- **Garantir SLA** com contagem coerente, alertas de risco e estouro, e escalonamento automatizado quando as regras de negócio assim determinarem.
- **Rastrear tudo o que importa para compliance**: quem fez o quê, quando, sobre qual entidade, com valor anterior e novo quando aplicável.
- **Dar visão gerencial** por dashboards e KPIs (MTTR, MTBF, cumprimento de SLA, disponibilidade, volumes por criticidade/equipe/período).
- **Ser enterprise-ready** por arquitetura: microsserviços, APIs REST, mensageria, processamento assíncrono, segurança em camadas e estratégia de dados relacional + cache/filas.

### 1.2 Público e stakeholders

| Stakeholder | Interesse principal na PGIC |
|-------------|-----------------------------|
| Times de TI / Suporte | Operação diária de filas, estados, comentários, reatribuição |
| NOC | Visibilidade de criticidade, integrações de monitoramento, alertas |
| Gestores de TI / Operações | Gargalos, capacidade, cumprimento de SLA, relatórios |
| Diretoria | KPIs consolidados, tendências, exportações para apresentação |
| Usuários de negócio (internos) | Abrir e acompanhar chamados via catálogo e portal |
| Segurança e compliance | RBAC, logs de acesso, auditoria, LGPD no tratamento de dados pessoais |

### 1.3 Por que isso é “corporativo” (além do nome)

Um sistema corporativo não é apenas “usado na empresa”: ele deve suportar **múltiplos usuários e perfis**, **grandes volumes**, **integrações**, **confiabilidade**, **governança** e **evolução sem travar o negócio**. O **RequisitosCorp.md** formaliza isso em dimensões objetivas.

A PGIC materializa o corporativo em duas frentes:

1. **Frete ITSM** — incidentes, requisições, problemas, mudanças, SLA, métricas (conteúdo de negócio típico de ferramentas como ServiceNow, Jira Service Management ou Zendesk, adaptado à arquitetura local do projeto).
2. **Frete arquitetura / plataforma** — microsserviços, PostgreSQL + Redis + RabbitMQ, gateway Nginx, separação front/back, Docker Compose no desenvolvimento, DDD + hexagonal no código, pacote `@pgic/shared` para contratos comuns.

**Nota sobre documentação auxiliar:** o arquivo **ExemploDennys.md** no repositório descreve outro domínio (BuildMind AI / BIM); não faz parte do escopo funcional da PGIC, mas ilustra um padrão de narrativa “dor → solução → integração corporativa” semelhante ao argumentário da plataforma de incidentes.

---

## 2. Mapa lógico: RequisitosCorp ↔ PGIC

Esta secção amarra cada grande capítulo do **RequisitosCorp.md** ao que a PGIC deve entregar ou já estrutura no monorepo.

| Capítulo RequisitosCorp | Significado | Como a PGIC responde |
|-------------------------|-------------|----------------------|
| §2 Requisitos funcionais | Usuários, acesso, auditoria, KPIs | RF-1…RF-4 em *AnaliseRequisitos.md*; serviços identity, audit, reporting |
| §3 Não funcionais | Segurança, performance, escala, HA, interoperabilidade | Políticas transversais; Redis; gateway; observabilidade |
| §4 Microsserviços | Domínios separados, REST, stateless | Pacotes por serviço; `MICROSERVICES_LIST.md` |
| §5 Front / Back | API REST, JSON | Front/BFF consumindo APIs; Swagger unificado (`api-docs`) |
| §6 Bancos | Relacional + não relacional | PostgreSQL por serviço; Redis; uso futuro/ampliado de document store conforme desenho |
| §7 RabbitMQ | Assíncrono, filas | Eventos `user.created`, outbox, filas entre serviços |
| §8 Processamento assíncrono | Jobs, DLQ, retry | Relatórios pesados, notificações, integrações |
| §9 Integrações | Bidirecional, webhooks, logs | *integration-service* planejado; RF-9.x |
| §10 Infra | Docker, K8s, CI/CD | `docker-compose`; pipelines e K8s como evolução |
| §11 Testes | Unitário, integração, carga, segurança, contrato | Vitest no monorepo; expandir conforme governança |
| §12 Governança | Git, review, docs, segurança | README + docs; políticas de PR |

---

## 3. Stack e artefatos do repositório (contexto técnico)

Síntese do **README.md** e documentos de arquitetura:

- **Linguagem:** TypeScript (strict).
- **Monorepo:** pnpm workspaces.
- **Dados:** PostgreSQL (Prisma por serviço), Redis (cache/sessão), RabbitMQ (eventos/filas).
- **HTTP:** Express nos serviços; **Nginx** como API Gateway (`/identity/`, `/request/`, etc.).
- **Padrões:** DDD, arquitetura hexagonal (`domain/`, `application/`, `infrastructure/`), contratos compartilhados em `@pgic/shared`.
- **Pacotes relevantes no monorepo** (além de `shared`): serviços de domínio (identity, request, incident, problem-change, sla, escalation, notification, audit, reporting), **frontend**, **bff**, **api-docs**.

Esta base é o que permite afirmar que o projeto **não é apenas um CRUD único**, mas uma **plataforma** onde cada bounded context pode evoluir e escalar de forma relativamente independente — requisito típico do texto corporativo.

---

## 4. Checklist — Requisitos funcionais corporativos (RequisitosCorp §2) ↔ domínio PGIC

### 4.1 Gestão de usuários (RequisitosCorp §2.1 ↔ RF-1.x)

Conforme **AnaliseRequisitos.md**, a PGIC exige gestão de usuários compatível com operações reais (cadastro em lote, desativação sem quebrar histórico, perfis operacionais NOC/Suporte/Gestor/Admin).

- [x] **Cadastro, edição e exclusão/desativação de usuários** com dados mínimos e política de senha (RF-1.1–RF-1.3).
- [x] **RBAC** com perfis alinhados à operação (Usuário Final, Analista, NOC, Gestor, Administrador) e, se aplicável, permissões granulares e exceções por usuário (RF-1.4, RF-2.2).
- [~] **Autenticação segura** JWT e/ou OAuth2; hash forte de senha; opcional integração AD/LDAP em roadmap (RF-1.5). *(JWT + OAuth Google/GitHub opcional; Argon2; AD/LDAP não implementado.)*
- [~] **Recuperação de senha** com fluxo assíncrono (fila), expiração de token/código, mensagem genérica na UI, rate limiting (RF-1.6). *(Token, expiração, resposta genérica e rate limit no serviço; envio de e-mail via fila/SMTP não evidenciado no identity.)*
- [x] **Controle de sessão** — timeout, refresh, revogação ao desativar usuário, possibilidade de encerrar outras sessões (RF-1.7).
- [x] **Coerência com eventos** — ex.: publicação `user.created` para réplicas em outros serviços (*MICROSERVICES_LIST.md*).

### 4.2 Controle de acesso (RequisitosCorp §2.2 ↔ RF-2.x)

- [x] **Autorização em todas as camadas** — middleware no back-end; UI não é fronteira de segurança (RF-2.1).
- [x] **Permissões por módulo** (Incidentes, Requisições, Problemas, Mudanças, Relatórios, Configurações, Usuários) e por ação/escopo (RF-2.2).
- [x] **Logs de acesso** — login sucesso/falha, logout, acesso a recursos sensíveis, correlação com IP/user-agent (RF-2.3).

### 4.3 Auditoria e rastreamento (RequisitosCorp §2.3 ↔ RF-3.x)

- [~] **Registro de ações relevantes** — CRUD, mudança de status, reatribuição, comentários, aprovações, escalonamentos, anexos (RF-3.1). *(Histórico de estado/comentários em incidentes; anexos persistidos; audit-service com API dedicada; cobertura transversal a consolidar.)*
- [~] **Histórico de alterações** em campos críticos (serviço, prioridade, SLA, responsável, status) (RF-3.2). *(Histórico de status em incident-service; demais entidades parcial.)*
- [x] **Versionamento** onde compliance exigir — recuperação de versões anteriores, política de retenção (RF-3.3). *(Implementado em `problem-change-service` com snapshots `before/after` e endpoints `GET /api/problems/:id/versions` e `GET /api/changes/:id/versions`.)*
- [~] **Serviço dedicado de auditoria** consumindo eventos dos demais serviços (*audit-service* em *MICROSERVICES_LIST.md*). *(Serviço e API existentes; consumo automático de todos os eventos de domínio a verificar.)*

### 4.4 Dashboard com KPIs (RequisitosCorp §2.4 ↔ RF-4.x)

- [~] **Métricas estratégicas** — MTTR, MTBF, % SLA cumprido, disponibilidade/uptime por serviço, volume por período (RF-4.1). *(reporting-service com CRUD de definições; agregações MTTR/MTBF em produto ainda não evidenciadas.)*
- [~] **Indicadores operacionais** — abertos por criticidade, em risco de SLA, filas por equipe, recém-abertos (RF-4.2).
- [~] **Filtros** por período, serviço, equipe, criticidade, unidade (RF-4.3).
- [~] **Exportação** PDF/CSV/Excel; relatórios pesados em background com notificação (RF-4.4). *(CSV de definições implementado; exportação pesada assíncrona pendente.)*
- [~] **Atualização dinâmica** — polling curto ou WebSocket/SSE; “última atualização” visível (RF-4.5). *(SPA no frontend; dashboards executivos completos pendentes.)*
- [~] **Cache de agregados** (Redis) com TTL definido para não sobrecarregar consultas. *(Redis no Compose; uso para KPIs agregados ainda não generalizado.)*

---

## 5. Checklist — Domínio ITSM da PGIC (*AnaliseRequisitos.md* RF-5 a RF-10)

### 5.1 Gestão de incidentes (RF-5.x) — *incident-service*

- [~] Abertura **manual** (formulário completo ou mínimo para usuário final) e **automática** (webhook/fila de monitoramento com mapeamento) (RF-5.1). *(API + UI manual com anexos; ingestão via **integration-service** + consumer `incident.integration_ingest`.)*
- [~] **Criticidade, impacto, serviço afetado, equipe** — regras de roteamento e impacto em SLA (RF-5.2). *(Modelo com criticidade e serviço; ligação operacional completa ao sla-service a consolidar na UX.)*
- [x] **Workflow** com estados e transições permitidas; invalidação de transições ilegais com mensagem clara (RF-5.3).
- [~] **SLA de resposta e resolução** por tipo/criticidade/serviço; exibição de contadores e estados de pausa (RF-5.4). *(sla-service existe; contadores no incidente/UI a verificar.)*
- [x] Eventos de domínio para outros serviços (`incident.created`, mudança de status, atribuição).

### 5.2 Requisições de serviço (RF-6.x) — *request-service*

- [x] **Catálogo** de itens com categoria, equipe, SLA padrão, formulário dinâmico e fluxo de aprovação (RF-6.1). *(Validação servidor de `formData` vs JSON Schema em `formSchema` na criação e na submissão.)*
- [~] **Workflow** Submetida → Em Aprovação → Aprovada/Rejeitada → Em Atendimento → Concluída/Cancelada conforme tipo (RF-6.2). *(Transições REST + trilha `workflow_events`; aprovação sequencial/paralela multi-nível ainda não diferenciada.)*
- [x] Réplica de usuários para exibição (`user.created` → `replicated_users`, conforme documentação do serviço).

### 5.3 Problemas e mudanças (RF-7.x) — *problem-change-service*

- [x] Problemas com **vínculo N:1** a incidentes; lista de incidentes por problema (RF-7.1).
- [x] **Causa raiz** e **plano de ação** documentados e auditáveis (RF-7.2).
- [~] **Mudanças** com janela, risco, rollback, aprovações e estados até Concluída/Rollback (RF-7.3). *(Modelo e domínio com estados e janela; fluxo CAB completo a validar face aos use cases expostos.)*

### 5.4 SLA e escalonamento (RF-8.x) — *sla-service*, *escalation-service*, *notification-service*

- [~] Políticas de SLA por tipo, criticidade, cliente/contrato, serviço; resolução de conflito entre regras (RF-8.1). *(sla-service: CRUD + `resolveBestMatch` + `sla_assignments`.)*
- [~] **Tempo útil** — calendário, feriados, horário comercial; pausa em estados configuráveis (RF-8.2). *( `business-time.ts`, consumer de status, scheduler de avaliação.)*
- [~] **Escalonamento** por tempo sem resposta, proximidade de estouro, criticidade; histórico de ações (RF-8.3). *(Consumers incident/SLA + `escalation_history`; `no_first_response` pendente.)*
- [~] **Alertas** por e-mail, Slack, Teams, webhooks; templates e destinatários por regra; assíncrono com retry/DLQ (RF-8.4). *(notification-service presente; canais/DLQ documentados operacionalmente — pendente.)*

### 5.5 Integrações externas (RF-9.x) — *integration-service*

- [~] **Entrada** — webhooks/API com autenticação, validação, mapeamento configurável, respostas HTTP corretas para erro (RF-9.1). *(Webhook monitoring v1 + outbox + incident ingest; mapeamento severidade→criticidade.)*
- [x] **Saída** — envio para ERP/CRM/diretório com timeout, retry, não bloqueio do fluxo principal (RF-9.2). *(Implementado em `integration-service`: `POST /api/outbound/v1/deliver` + processamento assíncrono com timeout, retry e DLQ no relay.)*
- [~] **Logs** de integração mascarando dados sensíveis; inspeção e reprocessamento de DLQ (RF-9.3). *( `integration_logs` expõe metadados; `integration_dlq` tem listagem e reprocessamento via API; mascaramento segue responsabilidade do payload summary.)*
- [x] **Segurança em ingestão** — assinatura HMAC, rate limit, tamanho máximo de payload, allowlist opcional (*MICROSERVICES_LIST.md*). *(API key + HMAC opcional + rate limit + limite JSON 256kb + allowlist IP por env.)*

### 5.6 Processamento assíncrono (RF-10.x)

- [~] **Jobs em background** para relatórios, KPIs, e-mails em massa, sincronizações (RF-10.1). *(Relays outbox e workers parciais; jobs de relatório pesado não generalizados.)*
- [x] **Retry** com backoff e **DLQ** após N falhas; ferramenta ou API para reprocessar (RF-10.2). *(No `integration-service`, relay outbound com `maxAttempts`, backoff exponencial (`backoffMs`) e fallback para `integration_dlq`; reprocessamento via `POST /api/integration-dlq/:id/reprocess`.)*
- [x] **Outbox pattern** onde eventos devem ser consistentes com o estado transacional (recomendação em *MICROSERVICES_LIST.md*).

---

## 6. Checklist — Requisitos não funcionais (RequisitosCorp §3)

### 6.1 Segurança

- [~] Criptografia em trânsito (HTTPS) e proteção de dados sensíveis em repouso conforme modelo de ameaças. *(TLS típico em produção; stack local HTTP.)*
- [~] Defesas contra **SQL injection** (Prisma parametrizado + revisão), **XSS** no front, validação de entrada nos DTOs. *(Prisma + Zod; CSP/monitorização XSS em maturação.)*
- [~] **Rate limiting** em APIs expostas (gateway ou serviço). *(Express rate-limit em rotas sensíveis do identity; sem `limit_req` no Nginx.)*
- [~] **Backup** automatizado do PostgreSQL e política de retenção. *(Scripts `pnpm db:backup`, `pnpm db:backup:run`, `pnpm db:backup:check`, `pnpm db:restore`, `pnpm db:restore:test`, template cron em `infra/cron/pgic-backup.cron` e runbook; falta operacionalizar no ambiente produtivo com monitoramento central.)*
- [~] **LGPD** — base legal, minimização, retenção, anonimização em desativação quando exigido, registro de operações sobre dados pessoais. *(Runbook `docs/LGPD_OPERACIONAL_RUNBOOK.md` + scripts `pnpm privacy:anonymize-user` e `pnpm privacy:prune-identity` no `identity-service`; formalização jurídica/DPO e cobertura cross-service ainda pendentes.)*

### 6.2 Performance

- [~] Tempos de resposta aceitáveis para operações síncronas críticas. *(Sem metas p95/p99 documentadas no repositório.)*
- [~] **Redis** para cache de configurações, sessões e agregados de KPI. *(Redis no Compose; cache OAuth/sessão no identity; KPIs agregados a expandir.)*
- [x] Otimização de consultas e índices por serviço.
- [~] Tarefas pesadas **fora** do request HTTP principal (filas). *(Mensageria e outbox; relatórios pesados assíncronos genéricos pendentes.)*

### 6.3 Escalabilidade

- [x] Serviços **stateless** onde possível; sessão/token externalizados.
- [~] Escalabilidade horizontal de instâncias atrás do gateway/load balancer (evolução além do Compose). *(Nginx como gateway local; LB cloud/K8s fora do repo.)*
- [x] Desacoplamento via mensageria para picos de carga.

### 6.4 Disponibilidade

- [x] **Health checks** por serviço.
- [~] Monitoramento e alertas (métricas, logs centralizados). *(Healthcheck operacional automatizado `pnpm ops:healthcheck` com verificação HTTP/infra/backlog e webhook de alerta; centralização de métricas/logs/APM em produção ainda pendente.)*
- [x] Estratégia de failover para banco e broker em ambientes produtivos. *(Runbook operacional definido em `docs/ops/FAILOVER_RUNBOOK.md`, com validação pós-recuperação via `pnpm ops:healthcheck`.)*

### 6.5 Interoperabilidade

- [x] APIs **REST** padronizadas, JSON, erros consistentes (`ErrorResponseDto` no shared).
- [x] **Versionamento** de API documentado (caminho ou cabeçalho). *(Política formal em `docs/API_VERSIONING_POLICY.md` + OpenAPI por serviço.)*
- [~] Contratos estáveis para integradores e para **testes de contrato** entre serviços. *(OpenAPI e testes de integração presentes; cobertura automatizada em CI com `pnpm test:contract` inclui OpenAPI + eventos `request.*` (RabbitMQ) entre `request-service` e `notification-service`; expansão para demais domínios ainda pendente.)*

---

## 7. Checklist — Arquitetura corporativa moderna (RequisitosCorp §4–§8)

### 7.1 Microsserviços (§4)

- [x] Responsabilidade única por serviço; fronteiras alinhadas ao domínio ITSM (*MICROSERVICES.md*).
- [x] APIs REST próprias por serviço; banco dedicado por serviço quando aplicável (padrão `*_service` no Postgres).
- [x] Comunicação assíncrona para eventos de domínio e workloads.

### 7.2 Separação front-end / back-end (§5)

- [x] Front-end (e **bff** se usado) consumindo apenas APIs; sem lógica de negócio exclusiva no cliente.
- [x] Documentação unificada (**api-docs** / Swagger) para reduzir atrito de integração.

### 7.3 Estratégia de dados (§6)

- [x] **PostgreSQL** para dados transacionais e relacionamentos fortes.
- [x] **Redis** para cache/sessão/rate limit.
- [ ] Uso de **document store** para alto volume de logs/auditoria se/ad quando o volume justificar (*visãogeral.md*).

### 7.4 RabbitMQ e processamento assíncrono (§7–§8)

- [~] Filas para integração, notificação, relatórios, consumers idempotentes onde necessário.
- [~] **Dead-letter queues** e política de retry documentada operacionalmente.

---

## 8. Checklist — Integrações, infraestrutura, testes e governança (RequisitosCorp §9–§12)

### 8.1 Integrações (§9)

- [~] Contratos de entrada/saída versionados; logs com correlação (trace id). *(Logger shared; correlação ponta-a-ponta a uniformizar.)*
- [~] Timeouts e retries configuráveis por integração.

### 8.2 Infraestrutura (§10)

- [x] **Docker** para padronizar execução local e CI. *(Docker Compose para Postgres, Redis, RabbitMQ, Nginx; apps em dev via host.)*
- [ ] **Orquestração** (Kubernetes ou similar) para produção com auto scaling — roadmap infra.
- [~] **CI/CD** — build, testes, deploy com gates de qualidade. *( `.github/workflows/ci.yml`: lint, migrate, test, test:integration; deploy prod pendente.)*

### 8.3 Testes (§11)

- [x] Testes unitários nos use cases (Vitest no monorepo).
- [x] Testes de integração (API + banco + fila em ambiente controlado).
- [ ] Testes de carga em endpoints críticos (opcional por estágio).
- [ ] Testes de segurança (SAST/DAST conforme política).
- [~] Testes de contrato entre produtores/consumidores de APIs e eventos. *(CI com `pnpm test:contract` valida contratos OpenAPI e contratos de eventos RabbitMQ para `user.*`, `request.*`, `incident.*`, `integration.incident_ingest`, `sla.*` e `problem/change`; falta ampliar para demais fluxos/eventos.)*

### 8.4 Governança (§12)

- [~] Fluxo Git com branches e **code review** obrigatório. *(Git em uso; política de branch/review não versionada no repo.)*
- [x] Documentação técnica viva (README, docs, ADRs se adotados).
- [ ] Monitoramento contínuo e política de segurança da informação no SDLC.

---

## 9. Matriz compacta — microsserviços PGIC ↔ requisitos funcionais (*MICROSERVICES.md* / *MICROSERVICES_LIST.md*)

Use esta tabela para planejar evidências de cobertura (testes, métricas, demos).

| Serviço | RF principal (*AnaliseRequisitos*) | Papel na narrativa corporativa |
|---------|-----------------------------------|--------------------------------|
| **identity-service** | RF-1.x, RF-2.x | Identidade, RBAC, sessão, logs de acesso |
| **request-service** | RF-6.x | Catálogo e requisições com aprovação |
| **incident-service** | RF-5.x | Incidentes e workflow |
| **problem-change-service** | RF-7.x | Problemas e mudanças |
| **sla-service** | RF-8.1–RF-8.2 | Regras e contagem de SLA |
| **escalation-service** | RF-8.3–RF-8.4 | Regras de escalonamento |
| **notification-service** | RF-8.4 | Canais de alerta |
| **audit-service** | RF-3.x | Trilhas e versionamento auditável |
| **reporting-service** | RF-4.x, RF-10.x (jobs) | KPIs, dashboards, exportação |
| **integration-service** | RF-9.x | Webhooks, logs, ingestão assíncrona de incidentes |

---

## 10. Fluxo ponta-a-ponta — por que a plataforma “fecha” o ciclo corporativo

Referência sintética do *PensamentoInicial.md* e *visãogeral.md*:

1. Monitoramento detecta falha → **integração** recebe evento.
2. Evento entra na **mensageria** → **incident-service** cria incidente (rastreável).
3. **sla-service** calcula prazos em tempo útil → eventos de risco/estouro.
4. **escalation-service** aplica regras → **notification-service** alerta responsáveis/gestão.
5. **audit-service** registra ações; **reporting-service** atualiza KPIs (cache quando aplicável).
6. **identity-service** garante que cada ação seja **atribuída a um sujeito autenticado e autorizado**.

Esse fluxo explica a **relação lógica** entre o “intuito” da PGIC (operar TI com SLA e evidências) e cada capítulo do **RequisitosCorp**: não basta uma funcionalidade isolada; o valor corporativo emerge da **combinação** de identidade, domínio ITSM, assincronismo, auditoria e métricas.

---

## 11. Critérios de “pronto corporativo” para o projeto (definição operacional)

Considere a PGIC alinhada ao **RequisitosCorp** quando, no mínimo:

- [~] Os fluxos críticos de **autenticação, autorização e auditoria** estão implementados e testados de ponta a ponta.
- [~] **Incidentes** e/ou **requisições** percorrem ciclo completo com **histórico** consultável. *(Incidente com histórico; requisição com workflow completo ainda parcial.)*
- [~] **SLA** (mesmo que em versão inicial) aplica regras de forma explicável e testável.
- [~] **Integrações** críticas têm logs, retry e caminho de recuperação (DLQ/reprocessamento). *(Entrada webhook + DLQ schema; saída ERP e reprocessamento UI pendentes.)*
- [ ] **Dashboard/relatórios** refletem filtros e exportação com dados consistentes com o back-end.
- [~] **Infra de desenvolvimento** (Compose, migrations, gateway) está documentada e reproduzível; **roadmap** claro para HA e CI/CD em produção.

---

## 12. Referências internas do repositório

| Documento | Conteúdo |
|-----------|----------|
| [RequisitosCorp.md](./RequisitosCorp.md) | Definição do que é “sistema corporativo” e moderno neste projeto |
| [AnaliseRequisitos.md](./AnaliseRequisitos.md) | RF detalhados ITSM + corporativo (RF-1 a RF-10) |
| [visãogeral.md](./visãogeral.md) | Objetivos, stakeholders, escopo, NFRs, arquitetura |
| [PensamentoInicial.md](./PensamentoInicial.md) | Narrativa de problema/solução e fluxo exemplo (servidor fora) |
| [MICROSERVICES.md](./MICROSERVICES.md) | Decisões e matriz requisitos ↔ serviços |
| [MICROSERVICES_LIST.md](./MICROSERVICES_LIST.md) | Lista detalhada de serviços, capacidades, filas, prefixos |
| [README.md](../README.md) | Stack, como rodar, estrutura do monorepo |

---

*Documento gerado para dar contexto único ao projeto PGIC e servir de checklist vivo. Atualize os marcadores `[ ]` conforme o progresso real das squads e ambientes.*
