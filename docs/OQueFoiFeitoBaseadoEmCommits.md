# O que foi feito — síntese a partir dos commits Git

Este documento resume o **trabalho já entregue no repositório**, inferido a partir do **histórico de commits**, e relaciona esse progresso aos objetivos e fases descritos em:

- [ChecklistContextoCorporativoCompleto.md](./ChecklistContextoCorporativoCompleto.md) — contexto estratégico, mapa RequisitosCorp ↔ PGIC e checklists por capacidade.
- [ChecklistCompletoDetalhadoPassoAPasso.md](./ChecklistCompletoDetalhadoPassoAPasso.md) — espelho normativo (RC §1–§13) e **Fases 0–17** de implementação.

**Nota metodológica:** commits com mensagens genéricas (`fix`, `commit grande da pora`) foram interpretados com base em `git show --stat` para não perder escopo real. A matriz abaixo usa linguagem de **parcial / em progresso** onde os checklists corporativos exigem evidência de teste, produção ou política ainda não dedutível só pelo código.

**Atualização do resumo:** a tabela da secção 1 permanece ancorada no histórico Git analisado na altura da redação. A **secção 6** descreve **entregas adicionais** já presentes no código e na documentação do repositório (incluindo trabalho posterior à última linha da tabela), para alinhar este ficheiro ao *ChecklistCompletoDetalhadoPassoAPasso* sem reexecutar `git log` linha a linha.

---

## 1. Linha do tempo dos commits (do mais antigo ao mais recente)

| Ordem | Hash (curto) | Mensagem resumida | Conteúdo principal (inferido) |
|-------|--------------|-------------------|--------------------------------|
| 1 | `5eacc80` | Add files via upload | Carga inicial de arquivos no repositório. |
| 2 | `add2b33` | Fist Commit | Primeiro commit estruturado do projeto. |
| 3 | `0edcdd6` | Refactor project structure… | Renomeação **lframework → pgic**, remoção do serviço de catálogo, ajustes de `.env`, strings de banco, **README** e **documentação de API**; scripts e dependências do monorepo. |
| 4 | `4395c97` | Testes de integração e atualização de usuários (identity) | **identity-service**: Vitest configurado para separar testes de integração; fluxo de **atualização de usuário**; erros e validações; testes. |
| 5 | `f5a72cd` | Erros e testes (request-service) | **request-service**: classes de erro mais claras; **supertest**; script de teste de integração no `package.json`. |
| 6 | `6fb4267` | Integração do incident-service | **incident-service** no ecossistema: `.env.example`, scripts `pnpm`, **Nginx**, **api-docs** / OpenAPI, constantes RabbitMQ para eventos de incidente, **MICROSERVICES_LIST** (status do serviço). |
| 7 | `b54f95e` | fix: relay outbox… | **Outbox relay** (claim, commit, publish), falhas terminais, consulta **NULL-safe** em `replicated_user`, ajustes em **problem-change-service** e **migrations**. |
| 8 | `3772a05` | Criação do sla-service | Novo pacote **sla-service** (mensagem do commit com typo “sla-serviceD”). |
| 9 | `3b49c57` | Criação do escalation-service | Novo pacote **escalation-service**. |
| 10 | `a4367b1` | Criação do notification-service | Novo pacote **notification-service**. |
| 11 | `86493ff` | Criação do audit-service | Novo pacote **audit-service**. |
| 12 | `0d4ca3e` | Criação do reporting-service | Novo pacote **reporting-service**. |
| 13 | `c46ce31` | Refator identity (IAM amplo) | **identity-service**: migration grande **IAM** (`prisma`), repositórios (autorização, sessão, access log, password reset, user), **auth** (login/refresh/forgot/reset), **RBAC** (`rbac.controller` / rotas), middleware de autorização, DTOs. |
| 14 | `c7919df` | Frontend inicializado | **frontend** React/Vite operacional no monorepo. |
| 15 | `99d1eac` | fix | **make.cmd** / **make.ps1** para fluxo de build no Windows. |
| 16 | `dd9d641` | daigrams | **PlantUML** (BPMN, DER, mapeamento ORM) e imagens exportadas em `out/docs/`. |
| 17 | `e763065` | commit grande… | **Documentação** (este par de checklists, `DEVELOPMENT.md`, `TECHNICAL_REVIEW.md`, revisão `RequisitosCorp.md`, README); **frontend** com **IncidentSection** e **ServiceRequestSection**; **identity** com permissões efetivas e JWT; **incident** e **problem-change** com *helpers* de acesso HTTP e rotas; alinhamento de testes de integração em vários serviços. |
| 18 | `dd560b0` | Linking incidents to problems and changes | **problem-change-service**: vínculo de **incidentes** a **problemas** e **mudanças** (capacidade RF-7.x). |

---

## 2. O que isso representa em “capacidades PGIC”

Em linguagem de produto (alinhada ao *ChecklistContextoCorporativoCompleto*):

- **Arquitetura de microsserviços:** monorepo com serviços de domínio nomeados (identity, request, incident, problem-change, sla, escalation, notification, audit, reporting), **shared**, **api-docs**, **bff**, **frontend** — coerente com a matriz da secção 9 do checklist de contexto.
- **Mensageria e consistência:** constantes e integração de eventos (incidentes); **correção explícita do padrão outbox/relay** — alinha-se a RF-10 / RC §7–§8 e à recomendação de outbox em *MICROSERVICES_LIST*.
- **Identidade e governança de acesso:** evolução forte do **identity-service** (sessão, logs de acesso, reset de senha, RBAC, refresh) — cobre boa parte da **Fase 3** do checklist passo a passo e dos itens **§4.1–4.2** / **RC §2.1–2.2** do espelho normativo, ainda sujeitos a verificação formal (testes E2E, políticas em produção).
- **Canais operacionais:** **incident-service** e **request-service** com melhorias de API, erros e testes; **frontend** com telas/seções para incidentes e requisições — aproxima **Fase 4–5** e **Fase 12** (jornadas mínimas ainda incompletas face ao checklist detalhado). *Ver secção 6:* **request-service** passou a publicar eventos de domínio em `request.events` (outbox + relay), com **aprovação sequencial/paralela** persistida em `approval_state`, e o **notification-service** consome esses eventos para notificações in-app ao solicitante.
- **Problemas e mudanças:** serviço existente + **vínculo N:1 ou associação** incidente ↔ problema/mudança no último commit — atende diretamente **RF-7.1** / **Fase 6.1** em parte.
- **SLA, escalação, notificação, auditoria, relatórios:** **criação dos pacotes** correspondentes nos commits listados; o checklist corporativo considera “pronto” quando há políticas, jobs, consumidores, dashboards e evidências — aqui o histórico indica principalmente **estruturação e presença no monorepo** (**[~]** no sentido dos documentos direcionais).

---

## 3. Cruzamento com *ChecklistContextoCorporativoCompleto.md*

Referência rápida: secções 4–8 do documento de contexto (RF e NFR). Estado inferido **só** a partir dos commits:

| Área do checklist de contexto | Evidência nos commits | Avaliação indicativa |
|-------------------------------|------------------------|------------------------|
| **§4.1–4.2** Usuários e RBAC (RF-1, RF-2) | `c46ce31`, `4395c97`, `e763065` | **[~]** Modelo e API avançados; falta marcar `[x]` até haver matriz de módulos × ação validada e logs consultáveis em produto. |
| **§4.3** Auditoria (RF-3) | `86493ff` + consumo futuro | **[~]** Serviço criado; integração ponta-a-ponta com todos os fluxos sensíveis ainda é trabalho de fechamento (Fase 9). |
| **§4.4** KPIs / dashboard (RF-4) | `0d4ca3e` | **[~]** reporting-service criado; widgets, cache Redis e exportação são itens explícitos no checklist ainda não inferidos pelos commits. |
| **§5.1** Incidentes (RF-5) | `6fb4267`, `e763065`, `dd560b0` | **[~]** Serviço integrado, UI parcial, vínculos a problema/mudança; webhook automático e SLA de incidente podem estar parciais. |
| **§5.2** Requisições (RF-6) | `f5a72cd`, `e763065`; ver **secção 6** | **[~]** Catálogo, workflow, validação **AJV** de `formData` vs `formSchema`, **outbox** e eventos `request.*`, aprovação **single / sequential / parallel** com `approval_state`, testes de integração; permanecem lacunas do checklist (ex.: fila de equipe, E2E, exportação). |
| **§5.3** Problemas/mudanças (RF-7) | Serviço + `dd560b0` | **[~]** Vínculos reforçados; causa raiz, CAB, estados completos dependem de análise funcional. |
| **§5.4** SLA e escalação (RF-8) | `3772a05`, `3b49c57`, `a4367b1` | **[~]** Serviços presentes; políticas, calendário útil e DLQ operacionais são critérios das Fases 7–8. |
| **§5.5–5.6** Integrações / assíncrono (RF-9–10) | Outbox fix `b54f95e`; **secção 6** (request → RabbitMQ → notification) | **[~]** Base assíncrona melhorada; **request-service** publica no exchange `request.events`; **notification-service** consome fila `notification.request_events` para in-app ao solicitante; **audit**/reporting sobre o mesmo exchange ainda por amarrar. |
| **§6** NFR segurança, performance, etc. | Prisma, gateway, Redis no desenho global | **[~]** Commits não substituem pentest, rate limit em gateway ou backup — ver **Fase 13–14** do checklist detalhado. |

---

## 4. Cruzamento com *ChecklistCompletoDetalhadoPassoAPasso.md*

### 4.1 Espelho normativo (RC §1–§13)

Os commits **reforçam** sobretudo:

- **RC §4** (microsserviços), **RC §5** (front/back), **RC §6** (Postgres por serviço no desenho), **RC §7–8** (RabbitMQ e processamento assíncrono com outbox corrigido), **RC §12** em parte (documentação extensa em `e763065` e diagramas em `dd9d641`).

Itens do espelho que **não** ficam automaticamente `[x]` só por existir código: **RC §3.1** (LGPD, backup), **RC §3.4** (HA/failover), **RC §10.2–10.3** (K8s, CI/CD completo), **RC §11** (pirâmide de testes), **RC §9** (integração bidirecional versionada) — permanecem como **lacunas ou próximos passos** até haver evidência no repositório/pipeline.

### 4.2 Fases 0–17 (onde o histórico mais avançou)

| Fase | Tema | Relação com os commits |
|------|------|-------------------------|
| **0** | Decisões de escopo | Documentos e `RequisitosCorp.md` atualizados em `e763065` apoiam a Fase 0; decisões formais (SMTP, IdP, LGPD) continuam como itens de checklist, não como “feito” automático. |
| **1** | Ambiente local | `0edcdd6` (README/env), `99d1eac` (Make Windows), infra inferida do projeto. |
| **2** | `@pgic/shared`, erros, logs | Refinos em mappers de erro e rotas em vários commits (`f5a72cd`, `b54f95e`, `e763065`). |
| **3** | Identity completo | **Forte progresso** em `c46ce31`, `4395c97`, `e763065`. |
| **4** | Request-service | `f5a72cd` + UI em `e763065`; **secção 6** — outbox/publicação, aprovação multi-papel, documentação e testes alinhados ao checklist detalhado (4.2.2, 4.4 em parte). |
| **5** | Incident-service | `6fb4267`, `e763065`. |
| **6** | Problem/change | Base + `dd560b0` (vínculos). |
| **7–10** | SLA, escalação, notificação, audit, reporting | **Scaffolding / serviços criados** nos commits nomeados; **notification-service** com consumidor **request.events** (secção 6); fechamento de fase exige balanço de saída do próprio checklist. |
| **11–17** | Integração dedicada, front completo, NFR, CI/CD, go-live | Parcialmente tocados (front, docs, diagramas); **não** concluídos pelo histórico analisado. |

---

## 5. Diagramas e documentação de apoio

- **`dd9d641`:** BPMN de gestão de incidentes, DER e mapeamento ORM em PlantUML, com imagens geradas — úteis para **Fase 0/1** (onboarding) e para **RC §4–§6** (comunicação da arquitetura).
- **`e763065`:** Entrada dos próprios **checklists direcionais**, `DEVELOPMENT.md` e `TECHNICAL_REVIEW.md` — alinha o repositório à **governança** descrita em **Fase 16** e ao espelho **RC §12**.

---

## 6. Evoluções consolidadas no código (atualização — alinhamento ao checklist)

Conteúdo abaixo reflete o **estado atual do repositório** (código, migrações Prisma, testes e docs de apoio), incluindo trabalho **posterior** à última entrada da tabela da secção 1, para não subestimar o RF-6 e a integração assíncrona.

### 6.1 Request-service (RF-6.x)

- **Outbox + RabbitMQ:** tabela `outbox`, relay periódico, publisher no exchange topic **`request.events`** (`@pgic/shared`), com eventos `request.created`, `request.submitted`, `request.in_approval`, `request.approved`, `request.rejected`, `request.started`, `request.completed`; marcos **InApproval → InApproval** na aprovação multi-etapa **não** republicam na outbox (`skipOutbox`).
- **Validação de formulário:** **AJV** + JSON Schema do item de catálogo (`formSchema`) na criação da requisição e na submissão Draft → Submitted.
- **Workflow de aprovação:** campo JSON **`approval_state`** na entidade de requisição; fluxos **`single`** (qualquer papel da lista, um passo), **`sequential`** (ordem em `approverRoleIds`) e **`parallel`** (cada papel distinto deve aprovar; ordem livre); administrador pode aprovar de imediato; rejeição limpa `approval_state`.
- **Testes:** cobertura unitária do caso de uso de aprovação; integração API para fluxos **sequential** e **parallel**; testes de outbox em criação/submissão.
- **Documentação:** `packages/request-service/README.md`, `docs/MICROSERVICES_LIST.md`, `docs/ChecklistCompletoDetalhadoPassoAPasso.md` (ex.: itens 4.2.2 e 4.4), OpenAPI com `approvalState` na resposta da requisição.

### 6.2 Notification-service e `@pgic/shared`

- **Consumidor RabbitMQ:** fila **`notification.request_events`** (`QUEUE_REQUEST_EVENTS_NOTIFICATION`), binds às routing keys de `request.events`; envelope `{ type, payload }` alinhado ao publisher do request-service.
- **Comportamento:** cria notificação **`in_app`** para o **`requesterId`** com textos por tipo de evento (incluindo motivo em rejeição quando existir).
- **Constantes partilhadas:** `REQUEST_IN_APPROVAL_EVENT`, `REQUEST_STARTED_EVENT`, routing keys correspondentes, `REQUEST_DOMAIN_EVENT_NAMES`, fila acima.

### 6.3 Identity-service (complemento)

- **`GET /auth/me`:** inclusão do **`role`** no payload para o front e políticas de UI; ajustes em testes HTTP onde o construtor do controlador passou a exigir o repositório de autorização.

### 6.4 Migrações a aplicar em ambiente

- **request-service:** migrações **`outbox`** e **`approval_state`** em `service_requests` — executar `prisma migrate deploy` (ou fluxo equivalente) antes de validar integração em base real.

---

## 7. Conclusão

O repositório mostra uma **trajetória coerente com a PGIC corporativa**: fundação do monorepo (**pgic**), **identity** robusto, **incident** e **request** integrados à plataforma, **problem-change** com **associação a incidentes**, criação dos serviços transversais (**sla**, **escalation**, **notification**, **audit**, **reporting**), correção importante de **outbox/relay**, **frontend** inicial com fluxos visíveis de incidente e requisição, e **documentação estratégica** alinhada aos dois checklists referidos. A **secção 6** regista entregas recentes no **request-service** e na **mensageria** que aprofundam RF-6 e o encadeamento assíncrono.

Para **atualizar os marcadores `[ ]` / `[~]` / `[x]`** nos ficheiros de checklist com rigor, o passo seguinte recomendado é: para cada fase do *ChecklistCompletoDetalhadoPassoAPasso*, anexar **evidência** (comando de teste, print de Swagger, ou link de PR) — este ficheiro serve como **ponte entre Git e normativo**, não como substituto da verificação manual.

---

*Secção 1: gerada com base em `git log` e `git show` do ramo na altura da redação inicial. Secções 2–4: cruzamento normativo; **secção 6**: atualizada com base no código e na documentação do repositório. Atualize a secção 1 com novos hashes quando fizer sentido arquivar o histórico; mantenha a secção 6 ou funda-a em commits quando consolidar no Git.*
