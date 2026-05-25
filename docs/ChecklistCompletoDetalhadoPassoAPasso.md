# PGIC — Checklist completo detalhado (passo a passo, todas as necessidades)

Este documento é o **guia operacional máximo** para conceber, implementar, integrar, testar e operar a **Plataforma de Gestão de Incidentes Corporativos (PGIC)** em alinhamento com **RequisitosCorp.md**, **AnaliseRequisitos.md**, **visãogeral.md**, **MICROSERVICES_LIST.md** e a stack descrita no **README.md**. Não substitui decisões de produto da sua organização: onde houver escolha (por exemplo, OAuth2 vs apenas JWT, ou Kubernetes vs VM), o checklist indica **o que decidir** e **o que executar depois da decisão**.

**Cobertura total do RequisitosCorp.md:** imediatamente após esta introdução existe a secção **“Cobertura integral — espelho normativo do RequisitosCorp.md”**, com caixas de verificação para **cada parágrafo e lista** do documento oficial (§1 a §13). As **Fases 0–17** descrevem o **passo a passo de implementação**; o espelho garante **rastreabilidade 1:1** com o normativo corporativo.

**Relação com outros docs**

- **ChecklistContextoCorporativoCompleto.md** — contexto estratégico, mapa RequisitosCorp ↔ PGIC e checklists por capítulo (visão).
- **Este arquivo** — necessidades, ordem sugerida de trabalho, micro-passos, critérios de verificação e encerramento de fase.

**Legenda de marcas**

- `[ ]` — não iniciado ou não verificado.
- `[~]` — em progresso, parcial, ou dependente de ambiente/decisão pendente.
- `[x]` — concluído e verificado (teste, revisão ou evidência em ambiente alvo).

**Revisão de marcadores no repositório PGIC:** 2026-05-20 — a secção **«Cobertura integral — espelho normativo»** abaixo foi atualizada com base no código e no `docker-compose` local; as **Fases 0–17** mantêm sobretudo orientação processual: marque-as à medida que fechar entregas (muitos micro-passos ainda dependem de evidência manual).

**Princípio de uso**

1. Percorra as **fases na ordem** quando possível (fundacional antes de domínio; domínio antes de relatório enterprise completo).
2. Dentro de cada fase, execute os **passos numerados**; não pule “preparação” (variáveis, migrations, contratos) para não gerar dívida técnica invisível.
3. Ao final de cada fase, complete o **balanço de saída** (lista no fim da fase) antes de avançar.

---

## Cobertura integral — espelho normativo do RequisitosCorp.md

Use esta secção como **lista mestra**: quando todos os itens estiverem marcados `[x]`, o projeto cobre textualmente o documento **RequisitosCorp.md**. As fases numeradas abaixo detalham **como** implementar; esta secção garante que **nada do normativo foi esquecido**. Referências: § = secção do RequisitosCorp.

### RC §1 Introdução — características do sistema corporativo

- [x] Suporte a **múltiplos usuários** e operações concorrentes com modelo de permissões coerente.
- [~] Capacidade para **grandes volumes de dados** (estrategia de índices, paginação, arquivamento quando aplicável).
- [~] **Integração com outros sistemas** (REST, webhooks, mensageria) como capacidade de primeira classe.
- [~] **Alto nível de confiabilidade** — tratamento de falhas, filas, retries, observabilidade.
- [x] **Arquitetura moderna**: microsserviços, **mensageria** e **processamento assíncrono** explicitamente adotados no desenho.

### RC §2 Requisitos funcionais

#### RC §2.1 Gestão de usuários

- [x] **Cadastro** de usuários (fluxo e validação no back-end).
- [x] **Edição** de usuários (quem pode alterar o quê).
- [x] **Exclusão** — física apenas onde política permitir; **desativação** como padrão para preservar histórico.
- [x] **Controle de perfis e permissões (RBAC)** — papéis e, se aplicável, matriz por módulo/ação.
- [~] **Autenticação segura** — **JWT** e/ou **OAuth2** (conforme decisão da Fase 0).
- [~] **Recuperação de senha** — fluxo seguro e assíncrono.
- [x] **Controle de sessão** — timeout, revogação, opcional listagem/encerramento de sessões.

#### RC §2.2 Controle de acesso

- [x] **Autorização baseada em papéis** em todas as rotas/ações sensíveis.
- [x] **Permissões por módulo** (incidentes, requisições, relatórios, configurações, etc.).
- [x] **Logs de acesso** — autenticação, falhas, acessos a recursos sensíveis, consulta administrativa.

#### RC §2.3 Auditoria e rastreamento

- [~] **Registro de ações** dos usuários sobre entidades relevantes.
- [~] **Histórico de alterações** em campos críticos.
- [ ] **Versionamento de dados** onde compliance ou disputas operacionais exigirem reconstrução do passado.

#### RC §2.4 Dashboard com KPIs

- [~] **Visualização de métricas estratégicas** (MTTR, MTBF, SLA, disponibilidade, volumes — conforme escopo PGIC).
- [~] **Indicadores operacionais em tempo real** (ou quase real — polling/WebSocket/SSE).
- [~] **Filtros por período** (e demais dimensões acordadas: serviço, equipe, criticidade).
- [~] **Exportação de relatórios** (PDF, CSV/Excel ou equivalentes). *(CSV de definições em reporting-service; exportação assíncrona de dashboards/listas ainda pendente.)*
- [~] **Atualização dinâmica** da visualização sem recarregar a página inteira de forma grosseira (SPA + atualização incremental).

### RC §3 Requisitos não funcionais

#### RC §3.1 Segurança

- [~] **Criptografia de dados sensíveis** — em trânsito (TLS) e em repouso onde aplicável (campos, volumes de disco).
- [x] **Proteção contra SQL Injection** — consultas parametrizadas/ORM adequado, revisão de SQL dinâmico.
- [~] **Proteção contra XSS** — sanitização/escape no front, CSP quando maduro.
- [~] **Rate limiting** — gateway ou serviços nas APIs públicas e endpoints sensíveis.
- [ ] **Backup automatizado** — banco e política de retenção; testes de restore.
- [ ] **Compliance com LGPD** — bases legais, retenção, direitos do titular, minimização.

#### RC §3.2 Performance

- [~] **Baixo tempo de resposta** — metas definidas e medidas (p95/p99) nos fluxos críticos.
- [~] **Uso de cache** — **Redis** ou similar para sessão, agregados de KPI, configs quentes.
- [x] **Otimização de consultas** — índices, EXPLAIN em relatórios pesados, evitar N+1.
- [~] **Processamento assíncrono para tarefas pesadas** — relatórios, e-mails, integrações em massa via filas.

#### RC §3.3 Escalabilidade

- [~] **Escalabilidade horizontal** — múltiplas instâncias stateless por serviço atrás do balanceador.
- [~] **Balanceamento de carga** — Nginx/gateway em desenvolvimento; LB em staging/prod.
- [x] **Arquitetura desacoplada** — front separado, microsserviços, eventos assíncronos.

#### RC §3.4 Disponibilidade

- [ ] **Alta disponibilidade (HA)** — pelo menos planejada para Postgres, Redis, RabbitMQ e apps em produção (réplicas, quorum, SLA de infra).
- [ ] **Monitoramento com métricas e alertas** — latência, erros, filas, disco, pods/nós.
- [x] **Health checks** — por serviço, consumidos por orquestrador ou monitor.
- [ ] **Failover** — procedimento documentado para falha de nó, broker ou DB (mesmo que manual na primeira versão).

#### RC §3.5 Interoperabilidade

- [x] **APIs padronizadas RESTful** — recursos, verbos HTTP, códigos de status consistentes.
- [x] **Comunicação via JSON** — payloads e erros em JSON uniforme (`@pgic/shared`).
- [~] **Versionamento de API** — política `/v1` ou cabeçalho; depreciação documentada.
- [~] **Integração bidirecional com sistemas externos** — entrada (webhook/API) e saída (ERP, notificações, CRM).

### RC §4 Arquitetura baseada em microsserviços

#### RC §4.1 Divisão em serviços e benefícios

- [x] Sistema **dividido em serviços independentes**, cada um com **domínio específico** (usuários, incidentes, relatórios, etc.).
- [x] **Escalabilidade independente** por serviço (réplicas diferentes conforme carga).
- [~] **Deploy isolado** — pipeline por artefato/serviço sem redeploy monolítico obrigatório.
- [x] **Melhor manutenção** — fronteiras claras, ownership por time ou módulo.
- [~] **Maior resiliência** — falha parcial não derruba todo o sistema se isolamento estiver correto.

#### RC §4.1 — cada microsserviço deve

- [x] **Responsabilidade única** por serviço (evitar “god service”).
- [x] Ser **stateless** — estado em BD/cache/broker, não em memória local irrecuperável.
- [x] **Expor API REST própria** documentada (Swagger/OpenAPI).
- [x] **Possuir banco isolado quando necessário** — padrão um schema/DB por serviço na PGIC (PostgreSQL por serviço).

### RC §5 Separação entre front-end e back-end

#### RC §5.1 Comunicação via API RESTful

- [x] **Front-end desacoplado** — pacote `frontend` (e `bff` se usado) sem regra de negócio exclusiva no cliente.
- [x] **Back-end expõe APIs REST** — microsserviços atrás do gateway.
- [~] **HTTP/HTTPS** — TLS obrigatório fora do localhost.
- [x] **Uso de JSON** em request/response.

#### RC §5 — benefícios previstos pelo normativo (verificação de projeto)

- [x] **Independência tecnológica** — possibilidade de trocar stack do front sem reescrever domínio.
- [~] **Escalabilidade separada** — CDN/front vs APIs vs workers.
- [x] **Reutilização da API** — mobile futuro, integrações parceiros, scripts.

### RC §6 Banco de dados

#### RC §6.1 Banco relacional

- [x] Uso de **PostgreSQL** (ou MySQL/similar — na PGIC: **PostgreSQL** conforme README).
- [x] **Integridade referencial** — FKs e constraints onde fizer sentido.
- [x] **Transações ACID** para operações que alteram múltiplas linhas de forma atômica.
- [x] Modelagem para **dados estruturados** de negócio (incidentes, usuários, SLAs).

#### RC §6.2 Banco não relacional

- [~] Uso de **Redis** e/ou **MongoDB** ou similar para **alta performance** em cache, sessão, filas leves ou logs de alto volume.
- [~] Armazenamento de **logs**, **cache** ou **documentos** não estruturados conforme estratégia.

#### RC §6 — estratégia híbrida

- [x] **Relacional para dados críticos** de negócio e consistência forte.
- [~] **Não relacional** para performance, escalabilidade de leitura, telemetria ou auditoria volumosa (decisão documentada).

### RC §7 Mensageria com RabbitMQ

#### RC §7.1 Comunicação assíncrona — utilização do RabbitMQ para

- [~] **Processamento assíncrono** — workers consumindo filas.
- [x] **Comunicação entre microsserviços** — eventos de domínio, comandos assíncronos.
- [~] **Filas de tarefas** — relatórios, e-mails, replicação de dados.
- [x] **Garantia de entrega** — filas duráveis, confirmações de publicação/consumo, outbox onde necessário.

#### RC §7 — benefícios (checklist de adoção real)

- [x] **Desacoplamento** entre produtores e consumidores de eventos.
- [x] **Melhor escalabilidade** — workers paralelos por fila.
- [~] **Resiliência** — retry, DLQ, reprocessamento.
- [~] **Processamento distribuído** — múltiplos consumidores por fila.

### RC §8 Processamento assíncrono

O sistema deve suportar:

- [~] **Jobs em background** — schedulers/workers por serviço ou centralizados conforme desenho.
- [x] **Filas de processamento** — RabbitMQ com routing adequado.
- [x] **Eventos de domínio** — payloads versionados; contratos entre serviços.
- [~] **Retry automático** — backoff, limite de tentativas.
- [~] **Dead-letter queues** — inspeção e correção ou descarte controlado.

**Exemplos de uso previstos no normativo — mapeamento PGIC:**

- [~] **Geração de relatórios** — fila + arquivo temporário + notificação. *(Export CSV síncrono parcial; geração assíncrona com notificação pendente.)*
- [~] **Envio de e-mails** — recuperação de senha, alertas SLA, convites.
- [x] **Processamento de pagamentos** — *não aplicável à PGIC por padrão*; marcar N/A ou substituir por **cobrança interna de SLA**/integração financeira se existir.
- [~] **Atualização de KPIs** — jobs ou consumo de eventos para materializar agregados/cache.

### RC §9 Integrações externas

#### RC §9.1 Integração bidirecional — o sistema deve

- [ ] **Enviar dados para sistemas externos** — conectores configuráveis, fila de saída.
- [~] **Receber dados via API ou Webhook** — ingestão autenticada e validada. *(integration-service webhook v1.)*
- [~] **Validar dados recebidos** — schema/contrato antes de persistir. *(Zod + OpenAPI.)*
- [~] **Garantir autenticação nas integrações** — API keys, OAuth2, HMAC, mTLS conforme parceiro. *(API key + HMAC.)*

#### RC §9 — requisitos transversais de integração

- [~] **Logs de integração** — entrada/saída, status, correlação, mascaramento de segredos. *(integration_logs.)*
- [~] **Tratamento de falhas** — não corromper estado interno; registrar para retry. *(outbox + integration_dlq.)*
- [~] **Timeout e retry** — políticas por integração. *(relay outbox; saída ERP pendente.)*
- [x] **Versionamento de integração** — contrato webhook/API versionado (`v1`, header ou path).

### RC §10 Infraestrutura

#### RC §10.1 Containerização

- [x] **Docker** — imagens por serviço ou multi-stage conforme repositório.
- [x] **Isolamento de serviços** — rede/volumes/containers separados no Compose e em produção.

#### RC §10.2 Orquestração

- [ ] **Kubernetes ou similar** — roadmap ou já em uso em produção.
- [ ] **Auto scaling** — HPA ou equivalente para serviços stateless.

#### RC §10.3 CI/CD

- [x] **Pipeline automatizado** — build, testes, artefatos. *( `.github/workflows/ci.yml`.)*
- [x] **Testes automatizados** no pipeline (bloqueio de merge quebrado).
- [ ] **Deploy seguro** — staging, aprovação, rollback documentado.

### RC §11 Testes

- [x] **Testes unitários** — domínio e use cases.
- [x] **Testes de integração** — API + persistência + mensageria em ambiente controlado.
- [ ] **Testes de carga** — cenários de pico em endpoints e filas.
- [ ] **Testes de segurança** — SAST/dependências; revisão manual de superfície de ataque.
- [ ] **Testes de contrato** — OpenAPI/eventos entre produtor e consumidor de microsserviços.

### RC §12 Governança

- [x] **Controle de versão (Git)** — fluxo de branches documentado.
- [~] **Code review obrigatório** antes de merge na principal.
- [x] **Documentação técnica atualizada** — README, docs, Swagger, runbooks.
- [ ] **Monitoramento contínuo** — dashboards operacionais além do produto PGIC.
- [ ] **Política de segurança da informação** — classificação de dados, acesso, incidentes de segurança.

### RC §13 Conclusão — critérios “sistema corporativo e moderno”

Para fechar o normativo, verificar explicitamente:

- [x] **Arquitetura de microsserviços** adotada e documentada.
- [~] **Banco relacional e não relacional** em uso conforme estratégia (Postgres + Redis e/ou document store).
- [x] **Comunicação assíncrona com mensageria** (RabbitMQ) para eventos/tarefas críticas.
- [x] **Separação front-end e back-end via API REST** com JSON.
- [~] **Integrações bidirecionais** planejadas/implementadas onde o produto exige mundo externo.
- [~] **Processamento assíncrono** para tarefas pesadas e resiliente (retry/DLQ).
- [~] **Dashboards com KPIs** disponíveis aos perfis adequados.
- [~] **Interoperabilidade** — APIs versionadas e consumíveis por terceiros/mobile futuro.
- [~] **Escalável, seguro e resiliente** — evidências em testes, monitoramento e decisões de arquitetura.

---

## Fase 0 — Alinhamento de escopo, papéis e critérios de aceite

**Objetivo:** garantir que “corporativo” e “ITSM” significam o mesmo para gestão, desenvolvimento e operações antes de codificar em escala.

### 0.1 Inventário de decisões que bloqueiam implementação

- [ ] **Definir ambientes** — ao menos: desenvolvimento local, homologação/staging, produção. Para cada um: URL do gateway, URLs dos serviços (internas/externas), política de dados (staging anonimizado ou sintético).
- [ ] **Definir provedor de e-mail** para recuperação de senha e notificações (SMTP corporativo, SendGrid, etc.) e responsável pela configuração de SPF/DKIM se aplicável.
- [ ] **Definir política de identidade** — apenas usuário/senha local com JWT; ou SSO (OAuth2/OIDC) com qual IdP (Azure AD, Okta, Keycloak).
- [ ] **Definir política de dados pessoais (LGPD)** — quais campos são pessoais, bases legais, tempo de retenção, procedimento de exclusão/anonimização e titular de solicitações (DPO ou equivalente).
- [ ] **Definir SLAs de negócio iniciais** — mesmo que depois mudem: tempos de primeira resposta e resolução por criticidade ou por tipo de incidente (documento único “política de SLA v0”).
- [ ] **Definir calendário operacional** — fuso horário oficial, horário comercial, feriados corporativos (impacta sla-service).
- [ ] **Definir integrações obrigatórias na primeira versão** — por exemplo: apenas webhook de monitoramento; ou também ERP; ou também Slack/Teams.

### 0.2 Papéis e responsabilidades no projeto

- [ ] **Product owner / gestor de backlog** — prioriza RF por valor e risco.
- [ ] **Arquiteto ou referência técnica** — mantém fronteiras de serviço, contratos de API e eventos.
- [ ] **DevOps / SRE** — Compose local, pipeline, observabilidade, backups.
- [ ] **Segurança / compliance** — revisão de RBAC, logs, LGPD, integrações externas.
- [ ] **QA / testes** — plano de testes por RF crítico e regressão.

### 0.3 Documentação viva mínima (antes da Fase 1)

- [x] Manter **uma página** com links para: RequisitosCorp, AnaliseRequisitos, MICROSERVICES_LIST, README, este checklist.
- [~] Registrar **decisões arquiteturais** relevantes (formato livre ou ADR): por exemplo escolha de outbox vs publish direto por tipo de evento.

### Balanço de saída da Fase 0

- [ ] Lista de decisões pendentes **reduzida** ou cada pendência tem **owner** e **data alvo**.
- [ ] Critérios de aceite do MVP ou release 1.0 **escritos** (mesmo que em bullet points).

---

## Fase 1 — Pré-requisitos na máquina do desenvolvedor e no repositório

**Objetivo:** qualquer pessoa nova consegue rodar o núcleo local sem adivinhar comandos.

### 1.1 Software base

- [ ] Instalar **Node.js** compatível com o monorepo (verificar `engines` em `package.json` raiz se existir).
- [ ] Instalar **pnpm** na versão esperada pelo projeto.
- [ ] Instalar **Git** e configurar identidade (`user.name`, `user.email`) coerente com o corporativo.
- [ ] Instalar **Docker** e **Docker Compose** (no WSL2, Docker Desktop ou engine Linux conforme seu ambiente).
- [ ] Opcional mas recomendado: **GNU Make**, cliente **PostgreSQL** (`psql`), cliente Redis (`redis-cli`) para diagnóstico.

### 1.2 Obtenção do código e dependências

- [ ] Clonar o repositório no caminho desejado.
- [ ] Copiar `.env.example` para `.env` na raiz (`cp .env.example .env`).
- [ ] Preencher variáveis obrigatórias no `.env` (URLs de banco, Redis, RabbitMQ, segredos JWT, etc.) — **sem commitar segredos**.
- [ ] Executar `pnpm install` na raiz e resolver eventuais erros de versão de Node/pnpm.

### 1.3 Subida da infraestrutura local (containers)

- [x] Executar `pnpm docker:up` (ou o script documentado no README) e confirmar que **PostgreSQL**, **Redis**, **RabbitMQ** e **Nginx** sobem sem erro.
- [x] Verificar portas expostas (gateway em **8080** conforme README, serviços nas portas documentadas).
- [x] Acessar painel do RabbitMQ (se habilitado no compose) e confirmar login.
- [x] Confirmar que o Postgres aceita conexão com a URL usada nos serviços.

### 1.4 Banco de dados — criação e migrations

**Passos sugeridos (alinhados ao README):**

1. [ ] Com a infra no ar, executar `pnpm --filter identity-service run prisma:migrate:deploy` (ou script equivalente que cria DB se necessário).
2. [ ] Repetir para **cada serviço** com Prisma em uso no seu branch (ex.: `request-service`, e demais conforme existam migrations).
3. [ ] Confirmar que não há migrations pendentes em desenvolvimento ou que o estado está documentado se estiver em fluxo `migrate dev`.

### 1.5 Execução dos serviços de aplicação

**Passos:**

1. [ ] Subir **identity-service** (`pnpm dev:identity` ou comando do workspace) e validar health na porta local (ex.: 3001).
2. [ ] Subir **request-service** e validar porta (ex.: 3002).
3. [ ] Subir **api-docs** se disponível e abrir Swagger unificado.
4. [ ] Opcional: `pnpm dev` para conjunto padronizado conforme README.

### 1.6 Gateway e roteamento

- [x] Via navegador ou `curl`, chamar **http://localhost:${GATEWAY_PORT}** com prefixos `/identity/`, `/request/`, `/api-docs/` conforme documentação.
- [~] Confirmar que paths sem barra final ou com barra se comportam como esperado (padronizar no Nginx).
- [x] Registrar no README interno qualquer desvio (porta diferente, TLS local com mkcert, etc.).

### Balanço de saída da Fase 1

- [x] **Compose sobe** de forma repetível após `docker compose down` + `up`.
- [~] **Migrations aplicadas** nos serviços em uso.
- [x] **Gateway responde** e pelo menos um endpoint de health por serviço principal funciona através do proxy.

---

## Fase 2 — Fundações transversais: `@pgic/shared`, contratos, erros, logs

**Objetivo:** uniformizar comportamento entre microsserviços (RequisitosCorp: interoperabilidade, consistência de API).

### 2.1 Pacote shared

- [x] Revisar exportações de **DTOs de erro** (`ErrorResponseDto`) e garantir que todos os serviços usam o mesmo formato em falhas.
- [x] Revisar **validação** (schemas Zod ou equivalente) e reuso de fragmentos comuns (nome, e-mail, paginação).
- [~] Definir convenção de **paginação** e filtros nas APIs (`limit`, `cursor`, `page`) e documentar no api-docs. *(Convenção base documentada em `docs/DEVELOPMENT.md`; aplicar por endpoint nos serviços.)*
- [x] Centralizar constantes de **mensageria** (nomes de exchanges, routing keys) quando aplicável, evitando strings mágicas espalhadas.

### 2.2 Observabilidade mínima em cada serviço

- [~] **Logs estruturados** (JSON ou formato único) com `correlationId` ou `requestId` propagado do gateway quando possível.
- [~] Nível de log configurável por ambiente (`LOG_LEVEL`).
- [~] Nunca logar **segredos** (tokens, senhas, chaves API completas); mascarar payloads sensíveis em logs de integração.

### 2.3 Versionamento de API

- [~] Decidir estratégia: prefixo `/v1/` no gateway ou cabeçalho `Accept-Version`.
- [x] Documentar política de **deprecação** (avisos, período de convivência). *(Ver `docs/DEVELOPMENT.md` — secção Versionamento e deprecação.)*

### Balanço de saída da Fase 2

- [x] Novo endpoint em qualquer serviço segue o **mesmo padrão de erro/validação**.
- [x] Documentação Swagger reflete contratos compartilhados onde couber.

---

## Fase 3 — Identity-service: usuários, autenticação, RBAC, sessão (RF-1.x, RF-2.x)

**Objetivo:** cumprir base corporativa de identidade antes de expor dados operacionais sensíveis.

### 3.1 Modelo de dados e migrations

**Passos:**

1. [x] Modelar **usuário** com campos obrigatórios da AnaliseRequisitos (nome, e-mail único, login único, senha hash, perfil, status).
2. [x] Modelar **perfis/papéis** e relação usuário–perfil; prever **permissões por módulo** ou matriz configurável (RF-2.2).
3. [~] Incluir campos opcionais (telefone, departamento, cargo, idioma, fuso) se estiverem no escopo do release.
4. [~] Aplicar migrations e seeds apenas para **ambientes dev** (usuário admin inicial documentado).

### 3.2 Cadastro e edição (RF-1.1, RF-1.2)

**Passos:**

1. [x] Implementar **cadastro individual** com validação forte no back-end (não confiar no front).
2. [x] Implementar **edição** com regras: quem pode alterar o quê (próprio usuário vs administrador).
3. [x] Implementar **desativação (soft delete)** como padrão (RF-1.3); exclusão física apenas com processo e checagem de integridade.
4. [ ] Opcional: **importação em lote** CSV/Excel com relatório linha a linha.

### 3.3 Autenticação (RF-1.5)

**Passos:**

1. [x] Fluxo **login** com emissão de **access token** e **refresh token** (se adotado).
2. [x] Armazenar senha com **Argon2/bcrypt**; política de complexidade configurável.
3. [~] Se OAuth2/OIDC: registrar fluxo de callback, escopos, mapeamento de grupos do IdP para perfis internos.
4. [x] Documentar no Swagger como enviar o token (header `Authorization: Bearer`).

### 3.4 Recuperação de senha (RF-1.6)

**Passos:**

1. [x] Endpoint “solicitar reset” que não vaza existência de conta (mensagem genérica).
2. [x] Gerar token de uso único com expiração; persistir hash do token, não o token em claro.
3. [ ] Enfileirar envio de e-mail (**processamento assíncrono**).
4. [x] **Rate limiting** por IP/e-mail para evitar abuso.

### 3.5 Sessão e revogação (RF-1.7)

**Passos:**

1. [x] Definir onde a sessão vive: claims no JWT apenas; ou sessão server-side em **Redis** com lista de sessões ativas.
2. [x] Implementar **logout** que invalida refresh/sessão.
3. [x] Ao **desativar usuário**, revogar tokens/sessões imediatamente.
4. [x] Opcional: “encerrar outras sessões” e listagem de sessões por usuário para administrador.

### 3.6 Autorização e logs de acesso (RF-2.1, RF-2.2, RF-2.3)

**Passos:**

1. [x] Middleware de **autorização** por rota ou por annotação interna (facade única).
2. [x] Matriz **módulo × ação × escopo** persistida e cacheada com invalidação segura.
3. [x] Registrar **login sucesso/falha**, **logout**, tentativas bloqueadas; armazenar IP, user-agent, timestamp.
4. [x] Painel ou API admin para consultar logs de acesso com filtro por período e usuário.

### 3.7 Eventos de domínio (integração com outros serviços)

- [x] Implementar **Outbox** para `user.created` (ou evento equivalente) conforme padrão documentado em MICROSERVICES_LIST.
- [x] Operar **relay** que lê outbox e publica no RabbitMQ com confirmação.
- [~] Monitorar filas mortas ou backlog do relay.

### Balanço de saída da Fase 3

- [x] Fluxo completo: **cadastro → login → acesso a endpoint protegido → logout**.
- [x] Tentativa de acesso sem permissão retorna **403** padronizado.
- [x] **Logs de acesso** consultáveis e evento de usuário propagado para serviços que replicam dados de exibição.

---

## Fase 4 — Request-service: catálogo e requisições de serviço (RF-6.x)

**Objetivo:** canal estruturado de “pedidos” corporativos (acesso, equipamento, perfil), com aprovação quando exigido.

### 4.1 Catálogo de serviços (RF-6.1)

**Passos:**

1. [x] Modelar **item de catálogo**: nome, descrição, categoria, equipe responsável, SLA padrão, formulário dinâmico (JSON schema ou tabela de campos).
2. [x] CRUD administrativo do catálogo com RBAC (apenas perfis autorizados).
3. [x] Validar formulários dinâmicos no servidor contra o schema definido para o item. *(AJV + JSON Schema em `formSchema`; na criação e ao submeter Draft.)*

### 4.2 Requisição e workflow (RF-6.2)

**Passos:**

1. [x] Modelar **requisição** com estados: Rascunho → Submetida → Em Aprovação → Aprovada/Rejeitada → Em Atendimento → Concluída/Cancelada (ajustar nomes ao seu domínio).
2. [x] Implementar **aprovação sequencial ou paralela** conforme configuração do item. *(Campo `approval_state` JSON; `sequential` = ordem em `approverRoleIds`; `parallel` = cada papel distinto deve aprovar; `single` inalterado.)*
3. [x] Registrar **quem aprovou/rejeitou**, quando e motivo. *(Tabela `service_request_workflow_events` + endpoints approve/reject.)*
4. [~] Após aprovação, encaminhar para **fila da equipe** e permitir comentários e conclusão como em incidente simplificado.

### 4.3 Consumidor `user.created`

- [x] Garantir fila `request.user_created` (ou nome acordado) ativa.
- [x] Persistir **replicated_users** para exibir nome do solicitante sem RPC síncrono ao identity em toda listagem.

### 4.4 Integração assíncrona futura

- [~] Publicar eventos `request.*` para **auditoria** e reporting quando houver consumidor dedicado. *(Contratos + outbox + relay no request-service; **notification-service** consome `request.events` → in-app ao solicitante.)*

### Balanço de saída da Fase 4

- [x] Usuário final consegue **escolher item do catálogo**, enviar requisição e acompanhar estado.
- [x] Aprovador consegue **aprovar/rejeitar** com trilha persistida.

---

## Fase 5 — Incident-service: incidentes de TI (RF-5.x)

**Objetivo:** núcleo operacional da PGIC — desde um usuário abrindo chamado até encerramento com histórico.

### 5.1 Abertura manual (RF-5.1)

**Passos:**

1. [~] Formulário com campos obrigatórios: título, descrição, serviço afetado, criticidade, impacto (ajustar lista ao catálogo corporativo).
2. [x] Anexos com limite de tamanho e tipos permitidos; armazenamento seguro (disco local dev; S3 ou compatível em prod). *(API com conteúdo base64 até 1 MiB, tipos permitidos e persistência `BYTEA`; UI de anexo no frontend.)*
3. [x] Para usuário final, permitir **abertura mínima**; analista completa campos adicionais.

### 5.2 Abertura automática / integração (RF-5.1, RF-9.x)

**Passos:**

1. [ ] Contrato de webhook ou consumer de fila com payload documentado.
2. [ ] Mapeamento configurável: severidade externa → criticidade interna; serviço; texto padrão.
3. [ ] Marcar incidente como **origem automática** e guardar referência ao evento externo.

### 5.3 Dados de classificação e roteamento (RF-5.2)

**Passos:**

1. [x] Cadastro de **níveis de criticidade** e impacto no negócio.
2. [~] Catálogo de **serviços afetados** com vínculo a **equipes**.
3. [x] Regra inicial de atribuição por serviço; permitir **reatribuição** com auditoria.

### 5.4 Workflow de estados (RF-5.3)

**Passos:**

1. [x] Definir grafo de estados e **transições permitidas** por papel.
2. [x] Impedir transições ilegais no domínio (não só na UI).
3. [x] Em toda transição, opcionalmente exigir **comentário** (boa prática para auditoria).

### 5.5 SLA no incidente (RF-5.4 em conjunto com sla-service)

**Passos:**

1. [~] Ao criar/atualizar incidente, **resolver qual política de SLA** se aplica (chamada ao sla-service ou serviço embutido temporário).
2. [~] Exibir **prazos de resposta e resolução** e tempos restantes.
3. [~] Integrar **pausa** de SLA em estados como “Pendente cliente”.

### 5.6 Eventos de domínio

- [x] Publicar via outbox (recomendado): `incident.created`, `incident.status_changed`, `incident.assigned`.
- [x] Definir contrato JSON de cada evento (versionado).

### Balanço de saída da Fase 5

- [x] Incidente percorre **ciclo completo** com histórico de estados.
- [ ] Integração simulada cria incidente **idempotente** se o mesmo evento for reenviado (quando aplicável).

---

## Fase 6 — Problem-change-service: problemas e mudanças (RF-7.x)

**Objetivo:** elevar maturidade ITIL-like: causa raiz, mudança controlada, risco e rollback.

### 6.1 Problemas (RF-7.1, RF-7.2)

**Passos:**

1. [x] CRUD de **problema** com status e responsável.
2. [x] Vincular **N incidentes** a um problema; navegação bidirecional na UI/API.
3. [x] Campos de **causa raiz** e **plano de ação** (itens com responsável e prazo se desejado).

### 6.2 Mudanças (RF-7.3)

**Passos:**

1. [x] Modelar mudança com tipo (padrão, normal, emergencial), **risco**, **janela** de execução, **rollback**.
2. [~] Workflow: Rascunho → Submetida → Em Aprovação → Aprovada/Rejeitada → Agendada → Em Execução → Concluída/Rollback.
3. [~] Regra: mudança **alto risco** exige aprovação extra (CAB) se política assim definir.
4. [x] Vincular mudança a **incidentes/problemas** motivadores.

### 6.3 Eventos

- [x] Publicar `problem.created`, `change.created` para auditoria e notificações futuras.

### Balanço de saída da Fase 6

- [~] Da tela de incidente, associar a um problema existente ou criar novo.
- [~] Mudança não “executa” fora da janela aprovada (validação no domínio).

---

## Fase 7 — SLA-service: políticas, calendário, tempo útil (RF-8.1, RF-8.2)

**Objetivo:** tornar prazos **auditáveis** e **consistentes** (não apenas timers na UI).

### 7.1 Modelagem de políticas

**Passos:**

1. [x] Entidades: política de SLA, condições (tipo de chamado, criticidade, serviço, cliente), tempos de resposta e resolução.
2. [~] Algoritmo de **resolução de conflito** quando várias políticas coincidem (documentar a regra).
3. [~] API para **consultar** SLA aplicável a um incidente/requisição e para **recalcular** quando campos relevantes mudam.

### 7.2 Calendário e tempo útil (RF-8.2)

**Passos:**

1. [x] Configurar **dias úteis**, **feriados**, **janela diária** (ex.: 08:00–18:00).
2. [~] Implementar função de **adição de minutos úteis** a um instante inicial (testada com unitários em cenários de fim de semana e feriado).
3. [~] Pausar cronômetro em estados configuráveis.

### 7.3 Eventos de risco e estouro

**Passos:**

1. [~] Job ou consumer que compara **agora** com **deadlines** e emite `sla.risk` e `sla.breach`.
2. [~] Definir limiares de “risco” (ex.: 80% do tempo consumido).

### Balanço de saída da Fase 7

- [~] Dois ambientes com mesmos dados de entrada produzem **mesmos deadlines** (testes automatizados).

---

## Fase 8 — Escalation-service e Notification-service (RF-8.3, RF-8.4)

**Objetivo:** reação automatizada a atrasos e falhas de comunicação.

### 8.1 Regras de escalonamento (RF-8.3)

**Passos:**

1. [~] Cadastro de regras: condição (sem primeira resposta em X min, % do SLA, criticidade).
2. [~] Ações: notificar gestor, **reatribuir equipe**, aumentar prioridade (se modelo permitir).
3. [~] Consumir eventos de incidente e SLA.
4. [~] Persistir **histórico de escalonamentos** (quem foi notificado, qual regra disparou).

### 8.2 Notificações (RF-8.4)

**Passos:**

1. [~] Abstração de **canal**: e-mail (SMTP), Slack webhook, Teams webhook, webhook genérico.
2. [~] **Templates** com variáveis (`{{ticketId}}`, `{{title}}`, `{{link}}`).
3. [~] Fila de envio com **retry** e **DLQ**; logs de falha por provedor.
4. [~] Rate limit por canal para não estourar quotas SMTP ou APIs.

### Balanço de saída da Fase 8

- [~] Simular **estouro de SLA** em staging e verificar notificação e registro de escalonamento.

---

## Fase 9 — Audit-service: auditoria e histórico (RF-3.x)

**Objetivo:** prova para compliance e disputas operacionais.

### 9.1 Modelo de auditoria

**Passos:**

1. [x] Definir esquema imutável-append-only: quem, quando, entidade, ação, valores anterior/novo, correlation id.
2. [~] Consumir eventos dos demais serviços ou receber POST dedicado **autenticado serviço-a-serviço**.
3. [x] API de consulta por **entidade** (ex.: incidente #123) e por **usuário/período**.

### 9.2 Versionamento (RF-3.3)

**Passos:**

1. [ ] Para campos críticos, persistir snapshots ou event sourcing parcial.
2. [ ] UI/API para **comparar** duas versões.

### Balanço de saída da Fase 9

- [~] Toda ação sensível dos fluxos principais gera registro consultável.

---

## Fase 10 — Reporting-service: KPIs, dashboards, exportação (RF-4.x)

**Objetivo:** visão executiva e operacional prometida no RequisitosCorp.

### 10.1 Métricas estratégicas (RF-4.1)

**Passos:**

1. [~] Definir fórmulas documentadas: MTTR, MTBF, % SLA cumprido, uptime por serviço (fonte de verdade dos timestamps).
2. [ ] Implementar agregações com **cache Redis** e TTL.

### 10.2 Operacional em tempo quase real (RF-4.2, RF-4.5)

**Passos:**

1. [ ] Widgets: abertos por criticidade, em risco, fila por equipe.
2. [ ] Atualização por polling (30–60s) ou SSE/WebSocket se implementado.
3. [ ] Indicador “última atualização” na UI.

### 10.3 Filtros e exportação (RF-4.3, RF-4.4)

**Passos:**

1. [ ] Filtros globais por período, serviço, equipe, criticidade.
2. [~] Exportação PDF/CSV assíncrona com **notificação** ao concluir; expiração de arquivo temporário. *(CSV síncrono de definições implementado; exportação pesada assíncrona pendente.)*

### Balanço de saída da Fase 10

- [~] Gestor consegue **justificar números** apresentados à diretoria com a mesma base que o sistema calcula.

---

## Fase 11 — Integration-service e integrações externas (RF-9.x, RequisitosCorp §9)

**Objetivo:** mundo externo entra e sai sem corromper consistência interna.

**Espelho normativo:** **RC §9** (integração bidirecional, validação, autenticação, logs, falhas, timeout, retry, **versionamento de integração**).

**Evidência:** `packages/integration-service`, teste E2E `pnpm test:e2e`, script `pnpm e2e:webhook`.

### 11.1 Ingestão segura (RF-9.1)

**Passos:**

1. [x] Endpoints com **API key** ou mTLS/OAuth conforme parceiro. *( `X-API-Key` no webhook v1.)*
2. [x] Verificação de **assinatura HMAC** em webhooks quando aplicável. *( `INTEGRATION_WEBHOOK_SECRET` + `X-Signature`.)*
3. [x] **Payload máximo**, rate limit, allowlist de IP opcional. *(256kb + rate limit + `INTEGRATION_WEBHOOK_ALLOWED_IPS`.)*
4. [x] Validar schema; **400/422** para inválidos; log para análise sem persistir lixo.

### 11.2 Saída para sistemas externos (RF-9.2)

**Passos:**

1. [ ] Fila de envio com timeout, retry, backoff.
2. [ ] Falha não bloqueia commit do incidente no banco (eventual consistency aceita com compensação).

### 11.3 Observabilidade de integração (RF-9.3, RequisitosCorp §9 — requisitos transversais)

**Passos:**

1. [ ] Log estruturado: direção, endpoint, status HTTP, duração, id de correlação, payload mascarado.
2. [x] DLQ com **reprocessamento** manual seguro. *(GET `/api/integration-dlq`; POST `/api/integration-dlq/:id/reprocess` recoloca na outbox.)*
3. [ ] **Versionamento de integração** — contratos de webhook/API com versão explícita (`/v1/webhook`, header `X-API-Version`, ou payload `schemaVersion`); changelog quando quebrar compatibilidade.

### Balanço de saída da Fase 11

- [ ] Exercício de caos: provedor externo lento → sistema permanece responsivo nos fluxos principais.

---

## Fase 12 — Frontend e BFF (experiência do usuário corporativo)

**Objetivo:** traduzir capacidades do back-end em fluxos usáveis por todos os perfis.

### 12.1 Jornadas mínimas

- [~] **Usuário final:** login, abrir incidente/requisição, anexar arquivo, acompanhar status, receber notificação por e-mail (quando pronto). *(Anexos em incidente disponíveis; e-mail real pendente.)*
- [~] **Analista:** fila, pegar chamado, mudar estado, comentar, reatribuir.
- [ ] **Gestor:** dashboard, exportação, visão por equipe.
- [~] **Administrador:** usuários, perfis, parâmetros de integração (onde aplicável).

### 12.2 Segurança na UI

- [~] Esconder botões sem permissão **sem** confiar nisso como única defesa.
- [~] Tratar **401/403** com redirecionamento ou mensagem clara.

### Balanço de saída da Fase 12

- [ ] **Testes E2E** críticos (mesmo que poucos) cobrindo login e um fluxo de chamado.

---

## Fase 13 — Requisitos não funcionais transversais (RequisitosCorp §3)

**Referência cruzada:** esta fase detalha **como verificar** cada bloco **RC §3.1 a RC §3.5** do **espelho normativo** (“Cobertura integral — espelho normativo do RequisitosCorp.md”) no início do documento. Ao concluir a fase, os mesmos itens podem ser marcados `[x]` no espelho.

### 13.1 Segurança (RequisitosCorp §3.1)

1. [~] **Criptografia de dados sensíveis** — TLS 1.2+ em todos os endpoints públicos; dados sensíveis em repouso conforme política (volume cifrado no provedor, ou colunas sensíveis com criptografia aplicacional quando exigido).
2. [x] **Proteção contra SQL Injection** — uso exclusivo de consultas parametrizadas via ORM (Prisma); proibir concatenação de SQL com entrada do usuário; revisar relatórios ou buscas dinâmicas.
3. [~] **Proteção contra XSS** — escape/sanitização no front; evitar HTML não confiável; CSP progressiva; cookies `HttpOnly`/`Secure` se sessão via cookie.
4. [~] **Rate limiting** — no gateway (Nginx `limit_req` ou equivalente) e/ou middleware nos serviços; limites mais rígidos em login, recuperação de senha e APIs públicas de integração.
5. [ ] **Backup automatizado** — agendamento do PostgreSQL (snapshot gerenciado ou script); retenção definida; alerta em falha de backup; teste periódico de restore (ligado à Fase 14).
6. [ ] **Compliance com LGPD** — inventário de dados pessoais; base legal por finalidade; minimização; acordo de operações com subprocessadores se usar nuvem; canal para solicitações do titular (exportação/eliminação dentro dos limites legais e técnicos).

### 13.2 Performance (RequisitosCorp §3.2)

1. [~] **Baixo tempo de resposta** — definir metas (ex.: p95 latência por tipo de rota); medir em staging/prod com APM ou métricas (Prometheus, OpenTelemetry).
2. [~] **Cache (Redis ou similar)** — sessão, agregados de KPI, configs frequentes; TTL e política de invalidação documentados.
3. [x] **Otimização de consultas** — índices alinhados a filtros reais; `EXPLAIN (ANALYZE)` em relatórios pesados; paginação obrigatória em listagens potencialmente grandes.
4. [~] **Processamento assíncrono para tarefas pesadas** — relatórios longos, envio em massa, sincronizações via RabbitMQ/workers (ver **RC §8**, Fases 8 e 10).

### 13.3 Escalabilidade (RequisitosCorp §3.3)

1. [~] **Escalabilidade horizontal** — múltiplas réplicas por serviço stateless; sessão não presa a um único pod sem sticky sessions inadequadas (preferir Redis para sessão).
2. [~] **Balanceamento de carga** — Nginx na frente localmente; em produção, LB de nuvem ou Ingress Kubernetes distribuindo para pods saudáveis.
3. [x] **Arquitetura desacoplada** — front independente do deploy do back; comunicação apenas por HTTP/JSON e eventos; evitar “mega chamada” síncrona encadeando todos os microsserviços num único request crítico.

### 13.4 Disponibilidade (RequisitosCorp §3.4)

1. [ ] **Alta disponibilidade (HA)** — para Postgres, Redis e RabbitMQ em produção: modo gerenciado, réplicas ou cluster conforme RTO/RPO; não aceitar single point of failure não documentado.
2. [ ] **Monitoramento com métricas e alertas** — latência, taxa de erro 5xx, profundidade de filas, uso de CPU/memória, espaço em disco do DB.
3. [x] **Health checks** — endpoints `/health` (vivo) e `/ready` (pronto para tráfego, incluindo DB/cache quando aplicável) para orquestrador.
4. [ ] **Failover** — runbook: reinício de broker, flush seguro de DLQ, promoção de réplica de banco se política existir.

### 13.5 Interoperabilidade (RequisitosCorp §3.5)

1. [x] **APIs padronizadas RESTful** — recursos nomeados, verbos HTTP corretos, códigos de status consistentes com `@pgic/shared`.
2. [x] **Comunicação via JSON** — request/response e erros em JSON; charset UTF-8.
3. [~] **Versionamento de API** — prefixo `/v1` ou estratégia por cabeçalho; changelog de breaking changes (alinhado à Fase 2).
4. [~] **Integração bidirecional com sistemas externos** — entrada (webhooks/API) e saída (ERP, chat, monitoração) conforme **RC §9** e **Fase 11**.

### Balanço de saída da Fase 13

- [ ] Checklist **RC §3.1 a RC §3.5** no espelho normativo revisado; itens não aplicáveis marcados como **N/A** com justificativa curta (ex.: “pagamentos externos fora do escopo PGIC”).
- [ ] Lista de riscos de segurança **priorizada** com mitigação ou aceite formal.

---

## Fase 14 — Infraestrutura, CI/CD, backups (RequisitosCorp §10 — RC §10)

**Espelho normativo:** **RC §10** (Docker/isolamento; orquestração K8s/autoscaling; CI/CD com testes e deploy seguro).

### 14.1 Containerização (RequisitosCorp §10.1)

- [~] **Docker** — Dockerfile ou build reproducível por serviço; `.dockerignore` para não vazar código sensível.
- [x] **Isolamento de serviços** — redes e volumes no Compose; em produção, namespaces/projects separados conforme política.
- [ ] Imagens com **tags imutáveis** (`sha` ou semver) para produção.
- [ ] Variáveis de ambiente injetadas pelo orquestrador, **não** copiadas em imagem.

### 14.2 Orquestração e auto scaling (RequisitosCorp §10.2)

- [ ] **Kubernetes ou similar** (ECS, Nomad, Docker Swarm em último caso) para produção quando sair do single-host.
- [ ] Manifestos ou Helm charts com **recursos** (requests/limits) definidos.
- [ ] **Horizontal Pod Autoscaler** ou equivalente com base em CPU/memória ou métricas customizadas (fila RabbitMQ, latência).
- [ ] **Readiness/liveness** ligados aos probes configurados na **Fase 13.4**.

### 14.3 Pipeline CI/CD (RequisitosCorp §10.3)

**Passos:**

1. [ ] Job de **install + lint + test** em todo PR.
2. [ ] Build de imagens e scan de vulnerabilidades (Trivy, Grype ou equivalente).
3. [ ] Deploy em staging automático a partir da branch acordada.
4. [ ] Deploy em produção com aprovação manual ou estratégia GitOps — **deploy seguro** (blue/green ou canário quando possível).

### 14.4 Backups e recuperação

- [ ] Backup automatizado do Postgres (frequência e retenção definidas).
- [ ] Teste periódico de **restore** (mesmo que trimestral).
- [ ] Backup de **definições** RabbitMQ se necessário para filas críticas duráveis.

### Balanço de saída da Fase 14

- [ ] Itens **RC §10.1 a RC §10.3** no espelho normativo revisados (Docker/isolamento; orquestração/autoscaling conforme road map de produção; CI/CD).
- [ ] Documento **RTO/RPO** alvo vs capacidade real verificada no último teste de restore.

---

## Fase 15 — Estratégia de testes (RequisitosCorp §11 — RC §11)

**Espelho normativo:** **RC §11** (unitário, integração, carga, segurança, contrato).

### 15.1 Por tipo de teste

- [x] **Unitários:** domínio puro (SLA tempo útil, transições de estado, validações).
- [x] **Integração:** API + DB + fila em ambiente efêmero ou dockerizado nos testes.
- [ ] **Contrato:** produtor/consumidor de eventos e OpenAPI entre equipes.
- [ ] **Carga:** endpoints de listagem e dashboard com volume esperado + margem.
- [ ] **Segurança:** SAST no CI; pentest pontual antes de go-live público.

### 15.2 Critérios de aceite por RF crítico

- [ ] Matriz RF (da AnaliseRequisitos) × caso de teste × evidência (link para suite ou relatório).

### Balanço de saída da Fase 15

- [ ] **Regressão automatizada** roda em cada merge principal sem falhas conhecidas bloqueantes.

---

## Fase 16 — Governança e operação contínua (RequisitosCorp §12 — RC §12)

**Espelho normativo:** **RC §12** (Git, code review, documentação, monitoramento contínuo, política de segurança da informação).

1. [x] **Controle de versão (Git)** — fluxo de branches (Git Flow, trunk-based ou equivalente) documentado; `main`/`master` protegida.
2. [~] **Code review obrigatório** — nenhum merge sem aprovação; checklist mínimo (segredos, SQL/injection, validação de entrada, testes, impacto em contratos de API/eventos).
3. [x] **Documentação técnica atualizada** — README, docs em `/docs`, Swagger (`api-docs`), runbooks de deploy e incidente.
4. [ ] **Monitoramento contínuo** — além do produto PGIC, observabilidade da plataforma (uptime dos serviços, filas, DB); integração com alertas (PagerDuty, Opsgenie, e-mail, etc.).
5. [ ] **Política de segurança da informação** — classificação de dados (público, interno, confidencial); tratamento de incidente de segurança (quem acionar, como registrar); alinhamento com área de SI/Risco quando existir.

**Operação contínua adicional**

- [ ] **On-call** ou responsável por plantão em produção definido.
- [ ] Revisão trimestral de **dependências** e atualização planejada (CVEs).

### Balanço de saída da Fase 16

- [ ] Itens **RC §12** no espelho normativo conferidos com evidência (link para política interna ou wiki).

---

## Fase 17 — Go-live e pós-produção

### 17.1 Pré-go-live (checklist operacional)

- [ ] Todos os segredos em cofre (Vault, AWS Secrets Manager, etc.), não em repositório.
- [ ] TLS válido e renovação automática.
- [ ] Monitoramento e alertas ativos (latência, erros 5xx, filas, disco DB).
- [ ] Plano de **rollback** da última release documentado.
- [ ] Comunicação aos usuários piloto (data, horário, limitações conhecidas).

### 17.2 Pós-go-live (primeiras 48–72 horas)

- [ ] War room ou canal dedicado para incidentes da própria plataforma.
- [ ] Coleta de feedback estruturado (bugs, melhorias).
- [ ] Ajuste de limites (rate limit, tamanho de anexo, timeouts).

### Balanço final

- [ ] **Relatório de encerramento** do go-live: o que funcionou, o que falhou, dívidas técnicas priorizadas.

### 17.3 Verificação final — RequisitosCorp §13 (RC §13)

Antes de declarar o sistema “corporativo e moderno” conforme o normativo, revisar **todas** as caixas da secção **RC §13 — Conclusão** no **espelho normativo** no início deste documento:

- [ ] Os **nove critérios** listados em RC §13 estão marcados `[x]` ou **N/A** justificado (ex.: stack Mongo opcional se apenas Redis for adotado inicialmente — desde que **RC §6** esteja satisfeito com decisão documentada).

---

## Apêndice A — Ordem sugerida de construção (resumo visual)

1. Fase 0–2 — decisões, ambiente, shared.  
2. Fase 3 — identity.  
3. Fase 4 — request-service (catálogo + requisições).  
4. Fase 5 — incident-service.  
5. Fase 7 — sla-service (pode começar antes do 5 em paralelo se houver equipe).  
6. Fase 8 — escalation + notification.  
7. Fase 9 — audit.  
8. Fase 6 — problem/change (pode paralelizar após incidente mínimo).  
9. Fase 10 — reporting.  
10. Fase 11 — integration-service.  
11. Fase 12 — front completo.  
12. Fases 13–17 — endurecimento, CI/CD, produção.

A ordem pode ser ajustada, mas **identity antes de dados sensíveis** e **SLA/notificação antes de prometer dashboard enterprise completo** reduzem retrabalho.

---

## Apêndice B — Tabela mestre RequisitosCorp.md ↔ secções deste checklist

| RequisitosCorp | Conteúdo do normativo | Onde cobrir neste documento |
|----------------|----------------------|-----------------------------|
| **§1 Introdução** | Multiusuário, volume, integração, confiabilidade; microsserviços + mensageria + assíncrono | **RC §1** (espelho); implicitamente **Fases 1–17** |
| **§2.1** Gestão de usuários | CRUD, RBAC, JWT/OAuth2, recuperação de senha, sessão | **RC §2.1**; **Fase 3** |
| **§2.2** Controle de acesso | Papéis, permissões por módulo, logs de acesso | **RC §2.2**; **Fase 3** |
| **§2.3** Auditoria | Ações, histórico, versionamento | **RC §2.3**; **Fase 9** |
| **§2.4** Dashboard KPIs | Métricas estratégicas/operacionais, filtros, exportação, atualização dinâmica | **RC §2.4**; **Fase 10** |
| **§3.1** Segurança | Criptografia, SQLi, XSS, rate limit, backup, LGPD | **RC §3.1**; **Fase 13.1** |
| **§3.2** Performance | Tempo de resposta, cache, consultas, assíncrono pesado | **RC §3.2**; **Fase 13.2** |
| **§3.3** Escalabilidade | Horizontal, balanceamento, desacoplamento | **RC §3.3**; **Fase 13.3** |
| **§3.4** Disponibilidade | HA, monitoramento/alertas, health checks, failover | **RC §3.4**; **Fase 13.4** |
| **§3.5** Interoperabilidade | REST, JSON, versionamento API, integração bidirecional | **RC §3.5**; **Fase 13.5**, **Fase 2**, **Fase 11** |
| **§4** Microsserviços | Serviços independentes; benefícios; responsabilidade única, stateless, REST, BD isolado | **RC §4**; **Fases 1–2**, pacotes em `packages/` |
| **§5** Front/back | FE desacoplado, BE REST, HTTP/S, JSON | **RC §5**; **Fase 12**, gateway **Fase 1** |
| **§6** Bancos | Relacional (Postgres/MYSQL…); não relacional (Mongo/Redis…); estratégia híbrida | **RC §6**; **Fase 1** (migrations), decisão Redis/Mongo **Fase 9–10** |
| **§7** RabbitMQ | Assíncrono, comunicação entre MS, filas, garantia de entrega | **RC §7**; **Fases 3–8**, Compose |
| **§8** Processamento assíncrono | Jobs, filas, eventos, retry, DLQ; exemplos (relatórios, e-mail, KPIs…) | **RC §8**; **Fases 8, 10, 11** |
| **§9** Integrações externas | Envio/recebimento, validação, auth; logs, falhas, timeout/retry, versionamento | **RC §9**; **Fase 11** |
| **§10** Infraestrutura | Docker; K8s/autoscaling; CI/CD | **RC §10**; **Fase 14** |
| **§11** Testes | Unitário, integração, carga, segurança, contrato | **RC §11**; **Fase 15** |
| **§12** Governança | Git, code review, docs, monitoramento, política de SI | **RC §12**; **Fase 16** |
| **§13** Conclusão | Lista dos 9 critérios “corporativo e moderno” | **RC §13** (espelho); validação final **Fase 17** + revisão do espelho |

### Apêndice B.1 — Necessidades PGIC (AnaliseRequisitos) para referência cruzada

| Necessidade | Fonte | Fases principais |
|-------------|-------|------------------|
| RF-1…RF-4 | AnaliseRequisitos | **3, 9, 10** |
| RF-5…RF-8 | Incidentes, SLA, escalação | **5–8** |
| RF-6 | Requisições | **4** |
| RF-7 | Problemas/mudanças | **6** |
| RF-9…RF-10 | Integrações e assíncrono | **11**, **8** |

---

## Apêndice C — Glossário rápido

- **ITSM** — IT Service Management; conjunto de práticas para entregar e operar serviços de TI.
- **SLA** — acordo de nível de serviço; aqui, tempos de resposta/resolução mensuráveis.
- **Outbox** — padrão que grava evento na mesma transação do dado e replica para mensageria de forma confiável.
- **DLQ** — fila de mensagens mortas; inspeção e reprocessamento manual ou corrigido.

---

*Última dica: trate este checklist como **contrato vivo**. Quando uma fase “fecha”, marque `[x]` e adicione uma linha “**Evidência:** link para PR, relatório de teste ou print de staging” no seu sistema de gestão — isso transforma documentação em rastreabilidade corporativa real.*
