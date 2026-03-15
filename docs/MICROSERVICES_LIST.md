# Lista Detalhada de Microserviços — PGIC

Lista completa dos microserviços necessários para a **Plataforma de Gestão de Incidentes Corporativos (PGIC)**, com responsabilidades, requisitos funcionais atendidos, capacidades principais e dependências. Baseado em **AnaliseRequisitos.md** e **visãogeral.md**.

---

## Resumo


| #   | Serviço                    | Status    | Responsabilidade principal                                       |
| --- | -------------------------- | --------- | ---------------------------------------------------------------- |
| 1   | **identity-service**       | Existe    | Usuários, autenticação, autorização (RBAC), sessões              |
| 2   | **request-service**        | Existe    | Catálogo de serviços e requisições de serviço                    |
| 3   | **incident-service**       | Existe    | Incidentes (CRUD, workflow, vínculos)                            |
| 4   | **problem-change-service** | Planejado | Problemas recorrentes e mudanças (Change Management)             |
| 5   | **sla-service**            | Planejado | Regras de SLA, calendário, contagem de prazos, risco/estouro     |
| 6   | **escalation-service**     | Planejado | Orquestração de escalonamentos e disparo de ações                |
| 7   | **notification-service**   | Planejado | Envio de e-mail, Slack, Teams, webhooks                          |
| 8   | **audit-service**          | Planejado | Trilhas de auditoria (ações de usuário e técnicas)               |
| 9   | **reporting-service**      | Planejado | KPIs, dashboards, relatórios, exportação                         |
| 10  | **integration-service**    | Planejado | Webhooks de entrada, integrações externas, publicação de eventos |


---

## 1. identity-service

**Status:** Existe.

**Responsabilidade:** Gestão de usuários, autenticação segura, controle de acesso baseado em papéis (RBAC) e controle de sessão.

### Requisitos atendidos

- **RF-1.1** — Cadastro de usuários (individual e em lote CSV/Excel)
- **RF-1.2** — Edição de usuários (dados, perfil, permissões, ativação, senha)
- **RF-1.3** — Exclusão/desativação (soft delete; exclusão física sob política)
- **RF-1.4** — Controle de perfis e permissões (RBAC): Usuário Final, Analista, NOC, Gestor, Administrador; matriz módulo × ação × escopo
- **RF-1.5** — Autenticação segura (JWT e/ou OAuth2; opcional AD/LDAP)
- **RF-1.6** — Recuperação de senha (link/código por e-mail, rate limiting)
- **RF-1.7** — Controle de sessão (timeout, encerrar outras sessões, listagem por usuário)
- **RF-2.1** — Autorização por papel em toda funcionalidade
- **RF-2.2** — Permissões por módulo (Incidentes, Requisições, Problemas, Mudanças, Relatórios, Configurações, Usuários) e por ação
- **RF-2.3** — Logs de acesso (login sucesso/falha, logout, recursos sensíveis)

### Capacidades principais

- CRUD de usuários; cadastro em lote com relatório de erros
- Login (login/e-mail + senha) com JWT (access + refresh) e/ou OAuth2 (Google, GitHub, corporate IdP)
- Hash de senha (Argon2/bcrypt); política de complexidade configurável
- Perfis e permissões configuráveis; exceções por usuário
- Recuperação de senha assíncrona (fila); sessões em Redis
- Publicação de evento `user.created` (RabbitMQ) para replicação em outros serviços

### Armazenamento

- PostgreSQL (banco `identity_service`): usuários, credenciais, perfis, permissões, outbox para eventos
- Redis (sessão, cache, rate limiting)

### Integrações

- **Publica:** `user.created` (exchange `user.events`, routing key `user_created`) via **Outbox Pattern**: evento gravado na tabela `outbox` na mesma transação do usuário; um relay periódico publica no RabbitMQ e marca como publicado.
- **Consumido por:** request-service (e futuros que precisem de cópia de usuário)

### Prefixo no gateway

- `/identity/`

---

## 2. request-service

**Status:** Existe.

**Responsabilidade:** Catálogo de serviços padronizados e requisições de serviço, incluindo fluxos de aprovação e atendimento.

### Requisitos atendidos

- **RF-6.1** — Catálogo de serviços padronizado (nome, descrição, categoria, equipe, SLA padrão, formulário, fluxo de aprovação)
- **RF-6.2** — Fluxos de aprovação e atendimento por tipo (Rascunho → Submetida → Em Aprovação → Aprovada/Rejeitada → Em Atendimento → Concluída)

### Capacidades principais

- CRUD de itens do catálogo (serviços solicitáveis)
- Criação de requisição a partir do catálogo (herda SLA e equipe; formulário dinâmico)
- Workflow de aprovação (sequencial/paralela; notificação ao aprovador; registro de aprovação/rejeição)
- Estados: Rascunho, Submetida, Em Aprovação, Aprovada, Em Atendimento, Concluída, Rejeitada, Cancelada
- Após aprovação, requisição na fila da equipe; atendimento com comentários e conclusão

### Armazenamento

- PostgreSQL (banco `request_service`): itens do catálogo, requisições, comentários, **replicated_users** (cópia local de usuários do identity-service para exibição de nomes sem chamar o identity).

### Integrações

- **Consome:** `user.created` (RabbitMQ, exchange `user.events`, fila `request.user_created`, routing key `user_created`). Eventos publicados pelo identity-service via **Outbox Pattern** (tabela `outbox`, relay publica no RabbitMQ). O request-service replica os dados na tabela `replicated_users` para uso em listagens (ex.: nome do solicitante).
- **Pode publicar:** eventos de requisição (criada, aprovada, concluída) para notificação e auditoria (futuro).

### Prefixo no gateway

- `/request/`

---

## 3. incident-service

**Status:** Existe.

**Responsabilidade:** Ciclo de vida de incidentes: abertura (manual e automática), criticidade, impacto, serviço afetado, equipe, workflow de estados e vínculos com problemas e mudanças.

### Requisitos atendidos

- **RF-5.1** — Abertura de incidentes (manual: formulário; automática: webhook/fila de monitoramento com mapeamento configurável)
- **RF-5.2** — Cadastro de criticidade, impacto, serviço afetado e equipe responsável (por regra ou manual)
- **RF-5.3** — Workflow de atendimento com estados configuráveis (ex.: Aberto → Em Análise → Em Atendimento → Pendente Cliente → Resolvido → Fechado)
- **RF-5.4** — SLA de resposta e resolução por tipo/criticidade (aplicado automaticamente; pausa em “Pendente Cliente”)

### Capacidades principais

- CRUD de incidentes; formulário com campos obrigatórios e opcionais
- Abertura automática via API/webhook (eventos de monitoramento); mapeamento severidade → criticidade/serviço/descrição
- Estados e transições configuráveis; registro de cada mudança (data, usuário, comentário)
- Vinculação a problema (N:1) e referência a mudanças que motivaram ou resolveram
- Consulta de prazos de SLA (resposta e resolução) ao sla-service ou cálculo local conforme contrato
- Publicação de eventos: `incident.created`, `incident.status_changed`, `incident.assigned` (para SLA, escalação, notificação, auditoria)

### Armazenamento

- PostgreSQL (incidentes, histórico de status, anexos, vínculos problema/mudança)

### Integrações

- **Consome:** `user.created` (RabbitMQ, fila `incident.user_created`) para replicação em `replicated_users`; regras de SLA (sla-service, futuro); eventos do integration-service (opcional).
- **Publica:** `incident.created`, `incident.status_changed`, `incident.assigned` via **Outbox Pattern** (exchange `incident.events`) para escalation-service, notification-service, audit-service, reporting-service.

### Prefixo no gateway

- `/incidents/`

---

## 4. problem-change-service

**Status:** Planejado.

**Responsabilidade:** Problemas recorrentes (causa raiz, plano de ação) e mudanças planejadas (Change Management): janela, risco, rollback, aprovação.

### Requisitos atendidos

- **RF-7.1** — Problemas vinculados a incidentes (cadastro de problema; vínculo incidente ↔ problema; lista de incidentes por problema)
- **RF-7.2** — Documentação de causa raiz e plano de ação (campos estruturados; template ex.: 5 porquês; resultado pós-implementação)
- **RF-7.3** — Mudanças com janela, risco, plano de rollback e aprovação (workflow: Rascunho → Submetida → Em Aprovação → Aprovada/Rejeitada → Agendada → Em Execução → Concluída/Rollback; política ex.: alto risco exige CAB)

### Capacidades principais

- CRUD de problemas; status (Aberto, Em Análise, Resolvido, Fechado); causa raiz e plano de ação
- Vínculo problema ↔ N incidentes; histórico e auditoria
- CRUD de mudanças: título, descrição, justificativa, tipo (padrão, normal, emergencial), risco (baixo, médio, alto), janela (início/fim), plano de rollback, aprovadores, vínculo com incidentes/problemas
- Workflow de mudança; execução apenas na janela aprovada; alteração de janela/risco pode exigir nova aprovação
- Publicação de eventos para notificação, auditoria e relatórios

### Armazenamento

- PostgreSQL (problemas, mudanças, vínculos, histórico de aprovações)

### Integrações

- **Consome:** dados de incidentes (referência ou evento) para vínculos
- **Publica:** eventos de problema/mudança para audit-service, notification-service, reporting-service

### Prefixo no gateway

- `/problems/`, `/changes/` (ou `/problem-change/` unificado)

---

## 5. sla-service

**Status:** Planejado.

**Responsabilidade:** Definição de regras de SLA, calendário de tempo útil, contagem de prazos (resposta e resolução) e detecção de risco/estouro.

### Requisitos atendidos

- **RF-8.1** — Definição de SLAs por tipo de chamado, criticidade, cliente ou serviço (condições + tempo resposta + tempo resolução + calendário)
- **RF-8.2** — Contagem em tempo útil (horário comercial, dias úteis, feriados; pausa em “Pendente Cliente” / “Aguardando Terceiros”)

### Capacidades principais

- Cadastro de políticas de SLA: condições (tipo incidente/requisição, criticidade, serviço, cliente), tempo para primeira resposta, tempo para resolução, calendário
- Resolução de conflito quando várias regras se aplicam (ex.: mais restritiva ou ordem de prioridade)
- Calendário configurável: dias da semana, feriados, horário de atendimento (ex.: 8h–18h)
- Cálculo de “vence em” e “estourado em” para resposta e resolução; pausa em status configuráveis
- API para outros serviços consultarem prazos aplicáveis a um chamado ou para obter “próximos vencimentos”
- Publicação de eventos: `sla.risk` (próximo do estouro), `sla.breach` (estouro) para escalation-service e notification-service

### Armazenamento

- PostgreSQL (políticas de SLA, calendários, feriados, histórico de aplicação de regras se necessário)
- Redis (cache de regras e cálculos frequentes; TTL definido)

### Integrações

- **Consumido por:** incident-service, request-service (aplicar SLA ao criar/alterar chamado)
- **Publica:** `sla.risk`, `sla.breach` para escalation-service e notification-service

### Prefixo no gateway

- `/sla/` (configuração e consultas administrativas)

---

## 6. escalation-service

**Status:** Planejado.

**Responsabilidade:** Orquestração de escalonamentos: avaliação de regras (tempo sem atendimento, proximidade de SLA, criticidade) e disparo de ações (notificação, reatribuição, alteração de prioridade).

### Requisitos atendidos

- **RF-8.3** — Escalonamento por tempo, SLA e criticidade (regras configuráveis; ações: notificar gestor, reatribuir para nível 2, alertar; execução por worker assíncrono)
- **RF-8.4** — Alertas por e-mail, Slack, Teams ou outros canais (configuração por tipo de evento e destinatários; envio assíncrono; retry/DLQ)

### Capacidades principais

- Cadastro de regras de escalonamento: condições (ex.: sem primeira resposta em X min, a Y% do prazo, criticidade crítica) e ações (notificar, reatribuir, alterar prioridade)
- Consumo de eventos: `incident.created`, `incident.status_changed`, `sla.risk`, `sla.breach`
- Worker que avalia regras e dispara ações: publica comandos para notification-service (envio de alerta) e pode chamar incident-service/request-service (reatribuição, mudança de prioridade)
- Histórico de escalonamentos registrado (próprio ou via audit-service)
- Não envia mensagens diretamente; delega ao notification-service

### Armazenamento

- PostgreSQL (regras de escalonamento, histórico de ações executadas)
- Redis (cache de regras; filas de trabalho)

### Integrações

- **Consome:** `sla.risk`, `sla.breach`, eventos de incidente/requisição
- **Chama:** notification-service (envio de alertas); incident-service/request-service (reatribuição/prioridade) ou publica eventos para eles

### Prefixo no gateway

- `/escalation/` (configuração de regras e histórico)

---

## 7. notification-service

**Status:** Planejado.

**Responsabilidade:** Envio de notificações por canais configuráveis: e-mail, Slack, Teams, webhook genérico. Processamento assíncrono com retry e DLQ.

### Requisitos atendidos

- **RF-8.4** — Alertas por e-mail, Slack, Teams, webhooks (por tipo de evento; destinatários por regra; template configurável; assíncrono; falha registrada e retry/DLQ)

### Capacidades principais

- Configuração por tipo de evento: novo chamado, mudança de status, comentário, risco de SLA, estouro de SLA, escalonamento
- Destinatários por regra: responsável, equipe, gestor, lista customizada
- Templates de mensagem (assunto, corpo, variáveis: número do chamado, título, link)
- Canais: SMTP (e-mail), Slack (webhook/bot), Microsoft Teams (webhook), webhook genérico
- Consumo de fila de “solicitações de notificação” (publicadas por outros serviços ou pelo escalation-service)
- Envio assíncrono; retry com backoff; DLQ após N falhas; logs de envio para diagnóstico

### Armazenamento

- PostgreSQL (configurações de canal, templates, histórico de envios para auditoria opcional)
- Redis (filas de envio, rate limiting por canal)

### Integrações

- **Consome:** mensagens da fila de notificação (publicadas por incident-service, request-service, escalation-service, etc.)
- **Integra com:** SMTP, Slack API, Teams API, webhooks externos

### Prefixo no gateway

- `/notifications/` (configuração, templates, teste de envio)

---

## 8. audit-service

**Status:** Planejado.

**Responsabilidade:** Centralização de trilhas de auditoria: ações dos usuários (quem, quando, o quê, valor anterior/novo) e eventos técnicos (integrações, falhas). Suporte a histórico de alterações e versionamento.

### Requisitos atendidos

- **RF-3.1** — Registro de ações dos usuários (criação, edição, exclusão de entidades; mudança de status; reatribuição; comentário; aprovação; escalonamento; anexos)
- **RF-3.2** — Histórico de alterações em campos críticos (serviço, prioridade, SLA, responsável, status)
- **RF-3.3** — Controle de versionamento de dados (recuperar versões anteriores; política de retenção configurável)

### Capacidades principais

- Consumo de eventos de auditoria publicados por outros serviços (identity, incident, request, problem-change, etc.)
- Armazenamento imutável: quem, quando, entidade (tipo + id), ação, valor anterior/novo, IP/origem
- API de consulta: por usuário, período, tipo de entidade, tipo de ação; por entidade (ex.: “histórico do incidente #123”)
- Versionamento de campos críticos: cópia antes da alteração ou event sourcing; comparação entre versões
- Logs técnicos de integração (entrada/saída, endpoint, resultado) podem ser enviados ao audit ou a repositório de logs dedicado

### Armazenamento

- PostgreSQL e/ou MongoDB (eventos de auditoria; histórico versionado; alto volume, consultas por período/entidade)
- Índices por usuário, data, entidade, tipo de ação

### Integrações

- **Consome:** eventos de auditoria de todos os serviços que realizam ações auditáveis
- **Expõe:** API de consulta para front-end (aba “Histórico”) e ferramentas de compliance

### Prefixo no gateway

- `/audit/`

---

## 9. reporting-service

**Status:** Planejado.

**Responsabilidade:** Consolidação de dados para KPIs, dashboards e relatórios; exportação em PDF/CSV/Excel; atualização em tempo quase real; jobs em background para relatórios pesados.

### Requisitos atendidos

- **RF-4.1** — Visualização de métricas estratégicas (MTTR, MTBF, % SLA cumprido, disponibilidade por serviço, volume de incidentes por período)
- **RF-4.2** — Indicadores operacionais em tempo (quase) real (incidentes abertos por criticidade, em risco de SLA, fila por equipe)
- **RF-4.3** — Filtros por período, serviço, equipe, criticidade, unidade
- **RF-4.4** — Exportação de relatórios (PDF, CSV/Excel); geração em background com notificação e link de download
- **RF-4.5** — Atualização dinâmica (polling ou WebSocket/SSE; indicador de “última atualização”)

### Capacidades principais

- Agregação de dados de incidentes, requisições, SLAs, problemas e mudanças (via leitura de outros serviços ou consumo de eventos)
- Cálculo de KPIs: MTTR, MTBF, percentual de SLA cumprido (resposta e resolução), disponibilidade por serviço, volume por período
- API para dashboards: métricas estratégicas e operacionais; filtros por período, serviço, equipe, criticidade
- Cache (Redis) de KPIs agregados com TTL; atualização periódica ou por evento
- Exportação: PDF (relatório formatado), CSV/Excel (dados tabulares); jobs em fila (RabbitMQ); notificação ao usuário com link para download; política de expiração de arquivos temporários
- Endpoints ou SSE/WebSocket para atualização dinâmica do dashboard (< 1 min em polling)

### Armazenamento

- PostgreSQL ou analítico (tabelas agregadas, snapshots de KPI)
- Redis (cache de KPIs e widgets)
- Armazenamento de arquivos (relatórios gerados) ou objeto (S3-compatible) com expiração

### Integrações

- **Consome:** dados ou eventos de incident-service, request-service, sla-service, problem-change-service
- **Publica ou notifica:** “relatório pronto” (para notification-service notificar usuário ou lista “meus relatórios”)
- **RF-10.1/10.2:** workers para jobs de relatório; retry e DLQ

### Prefixo no gateway

- `/reporting/` ou `/reports/`

---

## 10. integration-service

**Status:** Planejado.

**Responsabilidade:** Recebimento de dados externos (webhooks/API de monitoramento), validação, mapeamento configurável e publicação de eventos internos (ex.: criação de incidente). Envio para sistemas externos (ERP, CRM) e logs de integração com retry/DLQ.

### Requisitos atendidos

- **RF-9.1** — Recebimento de dados (webhook/API) para criação automática de incidentes ou atualização de status (endpoint seguro; validação; mapeamento configurável)
- **RF-9.2** — Envio de dados para sistemas externos (criação/atualização de chamado, mudança de status; API key/OAuth2; timeout e retry)
- **RF-9.3** — Logs de integração, tratamento de falhas, timeout, retry e DLQ; consulta e reprocessamento por administrador

### Capacidades principais

- **Entrada:** endpoint(s) seguro (API key ou OAuth2) para webhooks de monitoramento (Prometheus, Zabbix, etc.); validação do payload; mapeamento campo externo → interno (serviço, criticidade, descrição); publicação de evento “criar incidente” ou “atualizar status” para incident-service (ou fila consumida por incident-service)
- **Saída:** configuração por tipo de evento (chamado criado/atualizado, status, conclusão) e endpoint; autenticação (API key, OAuth2); timeout e retry configuráveis; envio assíncrono; falha não bloqueia fluxo principal; registro para retry/DLQ
- Log de todas as integrações: timestamp, direção (entrada/saída), endpoint, payload (mascarado se sensível), resposta, código HTTP, tempo; armazenamento com retenção configurável
- Tela/API administrativa: consulta de logs, reprocessamento de itens em DLQ

### Security

- **Webhook signature verification:** HMAC (or similar) with configurable secret/algorithm; verification in the ingestion path for all webhook endpoints (prefix `/integrations/`).
- **Rate limiting:** Per-source or per-app quotas and global limits; throttle and return 429 when exceeded.
- **Maximum payload size:** Configurable limit; reject and log oversized requests.
- **Optional IP allowlisting:** For known partners.
- These controls apply to both webhook ingestion endpoints and stored integration configurations (PostgreSQL mappings). Log and alert on security-related rejections so DLQ/reprocess flows can surface security failures.

### Armazenamento

- PostgreSQL (configurações de integração, mapeamentos, logs de integração ou referência)
- Filas RabbitMQ (entrada → processamento; saída com retry e DLQ)

### Integrações

- **Consome:** webhooks externos (monitoramento)
- **Publica:** eventos para incident-service (e eventualmente outros) para criação/atualização de incidentes
- **Chama:** sistemas externos (ERP, CRM) conforme configuração
- **Publica eventos técnicos:** para audit-service ou repositório de logs

### Prefixo no gateway

- `/integrations/`

---

## Visão geral de dependências e mensageria

- **identity-service** e **request-service** já existem; os demais são planejados.
- **Comunicação síncrona:** APIs REST entre serviços (ex.: incident-service consulta sla-service para prazos; front-end consome todos via gateway).
- **Comunicação assíncrona:** RabbitMQ — eventos de domínio (user.created, incident.created, sla.risk, etc.), filas de notificação, jobs de relatório, integração entrada/saída; retry e DLQ conforme RF-10.2.
- **Event publishing standard:** The **Outbox Pattern** (as used by identity-service) is recommended as the default for all services that publish domain events (incident-service, problem-change-service, sla-service, etc.): write the event in the same transaction as domain data, then relay to RabbitMQ. **Direct RabbitMQ publishing** is acceptable for non-critical telemetry or best-effort notifications. Outbox offers strong consistency and durability at higher implementation complexity; direct publishing is simpler but risks message loss on DB/transaction failures. Centralize helpers and operational expectations in `@pgic/shared` and follow RF-10.2 (retry/DLQ) for consumers.
- **Shared:** pacote `@pgic/shared` com DTOs, erro, validação, HTTP, logger, cache, constantes de mensageria; usado por todos os serviços.

---

## Referências

- **docs/AnaliseRequisitos.md** — Requisitos funcionais detalhados (RF-1.x a RF-10.x).
- **docs/visãogeral.md** — Objetivos, escopo e arquitetura de alto nível.
- **docs/MICROSERVICES.md** — Decisões atuais (identity e request) e matriz requisitos ↔ serviços.

