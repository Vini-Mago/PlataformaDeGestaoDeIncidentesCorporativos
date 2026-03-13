# Análise de Requisitos – Plataforma de Gestão de Incidentes Corporativos

**Documento baseado em:** RequisitosCorp e Visão Geral do Projeto  
**Objetivo:** Especificar de forma detalhada as funcionalidades que o sistema deve oferecer, alinhadas ao modelo corporativo e ao domínio ITSM (incidentes, requisições, problemas, mudanças, SLA e KPIs).

---

## 1. Introdução

Este documento descreve a **análise de requisitos funcionais** da Plataforma de Gestão de Incidentes Corporativos, derivada dos requisitos corporativos (RequisitosCorp) e da visão geral do projeto. Cada funcionalidade é descrita com critérios de aceite e detalhes necessários para implementação e validação.

O sistema deve atender múltiplos perfis (Operador NOC, Analista de Suporte, Gestor, Administrador, Usuário Final) e integrar-se a monitoramento, diretórios corporativos e canais de comunicação, mantendo rastreabilidade e conformidade com LGPD.

---

## 2. Requisitos Funcionais Detalhados

### 2.1 Gestão de Usuários

#### RF-1.1 Cadastro de usuários

- **Descrição:** O sistema deve permitir o cadastro de novos usuários com dados mínimos obrigatórios e opcionais.
- **Detalhamento:**
  - Campos obrigatórios: nome completo, e-mail (único), login (único), senha (com política de complexidade configurável), perfil/papel, status (ativo/inativo).
  - Campos opcionais: telefone, departamento/unidade, cargo, foto, idioma preferido, fuso horário.
  - Validação de e-mail e login para evitar duplicidade.
  - Possibilidade de cadastro em lote (importação CSV/Excel) com validação e relatório de erros.
- **Regras de negócio:**
  - Apenas usuários com perfil Administrador ou permissão equivalente podem cadastrar usuários.
  - O primeiro usuário do sistema ou usuário criado por processo de instalação pode ser definido como Administrador.
- **Critérios de aceite:**
  - Cadastro individual com feedback de sucesso ou lista de erros de validação.
  - Cadastro em lote com relatório indicando linhas processadas, aceitas e rejeitadas com motivo.

#### RF-1.2 Edição de usuários

- **Descrição:** Usuários cadastrados devem poder ser editados, com restrições conforme perfil de quem edita.
- **Detalhamento:**
  - Edição de dados pessoais (nome, e-mail, telefone, departamento, cargo, idioma, fuso).
  - Edição de perfil/papel e de permissões específicas (quando o modelo permitir permissões granulares).
  - Ativação e desativação de usuário (não exclusão física, para manter histórico e auditoria).
  - Alteração de senha pelo próprio usuário (com senha atual) ou por administrador (redefinição).
- **Regras de negócio:**
  - Usuário não pode remover seu próprio último perfil de Administrador.
  - Desativação de usuário deve encerrar sessões ativas e impedir novo login, sem apagar dados históricos.
- **Critérios de aceite:**
  - Alterações persistidas e refletidas em todas as telas que exibem o usuário; histórico de alterações registrado quando aplicável.

#### RF-1.3 Exclusão / desativação de usuários

- **Descrição:** O sistema deve suportar desativação (soft delete) de usuários; exclusão física apenas quando exigido por política e sem quebrar integridade referencial.
- **Detalhamento:**
  - Desativação: marcação de status “inativo”, fim de sessões e impossibilidade de novo login.
  - Exclusão física (se permitida): apenas por processo administrativo, com verificação de vínculos (incidentes, requisições, comentários) e opção de anonimização ou reatribuição.
- **Critérios de aceite:**
  - Usuário desativado não aparece em listas de seleção para atribuição de chamados, mas permanece em histórico e auditoria.

#### RF-1.4 Controle de perfis e permissões (RBAC)

- **Descrição:** O sistema deve implementar controle de acesso baseado em papéis (RBAC), com perfis pré-definidos e, opcionalmente, permissões customizáveis por módulo/funcionalidade.
- **Detalhamento:**
  - Perfis sugeridos: **Usuário Final**, **Analista de Suporte**, **Operador NOC**, **Gestor**, **Administrador**.
  - Por perfil, definir: módulos acessíveis (incidentes, requisições, problemas, mudanças, relatórios, configurações, usuários), ações permitidas (criar, editar, visualizar, excluir, aprovar, reatribuir, escalar) e escopo (próprios chamados, da equipe, de todos).
  - Possibilidade de permissões extras por usuário (exceções) sem alterar o perfil base.
  - Interface para administrador criar/editar perfis e atribuir permissões por módulo e ação.
- **Critérios de aceite:**
  - Cada tela e cada ação (botão, endpoint) validam perfil/permissão; acesso negado retorna mensagem clara e registro em log de segurança.

#### RF-1.5 Autenticação segura (JWT ou OAuth2)

- **Descrição:** O acesso ao sistema deve ser feito mediante autenticação segura, utilizando JWT ou OAuth2.
- **Detalhamento:**
  - Login por login/e-mail e senha com geração de token JWT (access + refresh) ou integração com provedor OAuth2 (corporate IdP).
  - Integração opcional com diretório corporativo (Active Directory / LDAP) para validar credenciais.
  - Tokens com tempo de expiração configurável; refresh token para renovação sem novo login.
  - Não armazenar senha em texto plano; uso de hash forte (ex.: bcrypt/Argon2).
- **Critérios de aceite:**
  - Acesso às APIs e ao front-end exige token válido; requisições sem token ou com token expirado retornam 401.

#### RF-1.6 Recuperação de senha

- **Descrição:** O usuário deve poder solicitar recuperação de senha quando não lembrar a senha atual.
- **Detalhamento:**
  - Fluxo: informar e-mail ou login → sistema envia link ou código temporário por e-mail (com expiração, ex.: 1 hora) → usuário redefine senha na tela segura.
  - Limite de tentativas por e-mail/IP para evitar abuso (rate limiting).
  - Mensagem genérica na tela (“Se o e-mail existir, você receberá instruções”) para não revelar existência de conta.
- **Critérios de aceite:**
  - E-mail de recuperação enviado de forma assíncrona (fila); usuário consegue redefinir senha e fazer login com a nova senha.

#### RF-1.7 Controle de sessão

- **Descrição:** O sistema deve controlar sessões ativas (token/sessão por usuário) e permitir encerramento e políticas de timeout.
- **Detalhamento:**
  - Sessão ativa vinculada ao token JWT ou identificador de sessão armazenado (ex.: Redis).
  - Timeout de inatividade configurável; logout automático após expiração e redirecionamento para tela de login.
  - Possibilidade de “encerrar outras sessões” (manter apenas a atual) e de administrador encerrar sessão de um usuário específico.
  - Listagem de sessões ativas por usuário (opcional), com IP, dispositivo e última atividade.
- **Critérios de aceite:**
  - Após timeout ou logout, nenhuma ação autenticada pode ser realizada com o token antigo; refresh token revogado quando aplicável.

---

### 2.2 Controle de Acesso

#### RF-2.1 Autorização baseada em papéis

- **Descrição:** Toda funcionalidade e recurso (telas, APIs, ações) devem ser autorizados conforme o perfil e as permissões do usuário.
- **Detalhamento:**
  - No back-end: middleware ou filtro que verifica perfil e permissões antes de executar a ação.
  - No front-end: exibição condicional de menus, botões e links conforme permissões (sem depender apenas do front para segurança).
  - Mensagem padronizada quando o usuário tenta acessar recurso não permitido (ex.: “Você não tem permissão para esta ação”).
- **Critérios de aceite:**
  - Usuário com perfil apenas “Usuário Final” não acessa telas de gestão de incidentes (reatribuição, edição de SLA, etc.); chamadas diretas à API retornam 403.

#### RF-2.2 Permissões por módulo

- **Descrição:** As permissões devem ser configuráveis por módulo (Incidentes, Requisições, Problemas, Mudanças, Relatórios, Configurações, Usuários) e por ação (criar, ler, atualizar, excluir, aprovar, escalar, etc.).
- **Detalhamento:**
  - Matriz perfil × módulo × ação (ou equivalente) armazenada em banco ou configuração, consultada em tempo de autorização.
  - Administrador pode alterar permissões de um perfil sem alterar código.
  - Escopo opcional: apenas próprios itens, da equipe, ou todos (por módulo).
- **Critérios de aceite:**
  - Alteração de permissão de um perfil refletida em todos os usuários daquele perfil no próximo request (ou após expiração de cache de permissões).

#### RF-2.3 Logs de acesso

- **Descrição:** O sistema deve registrar logs de acesso (login bem-sucedido e falho, logout, acessos a recursos sensíveis).
- **Detalhamento:**
  - Registrar: data/hora, usuário (ou identificador anônimo em caso de falha), IP, user-agent, recurso acessado (URL ou endpoint), método HTTP, resultado (sucesso/falha).
  - Logs de login falho para detecção de tentativas de invasão; possível bloqueio temporário após N tentativas.
  - Armazenamento em repositório adequado (arquivo, banco, sistema de logs) com retenção definida por política.
- **Critérios de aceite:**
  - Consulta (por administrador ou ferramenta de auditoria) de logs de acesso por usuário, período e tipo de evento.

---

### 2.3 Auditoria e Rastreamento

#### RF-3.1 Registro de ações dos usuários

- **Descrição:** Todas as ações relevantes dos usuários devem ser registradas para auditoria e compliance.
- **Detalhamento:**
  - Ações a registrar: criação, edição e exclusão de entidades (incidente, requisição, problema, mudança, usuário, configuração); mudança de status; reatribuição; adição de comentário; aprovação; escalonamento; anexos adicionados/removidos.
  - Para cada registro: quem (usuário), quando (timestamp), o quê (entidade e tipo de ação), valor anterior e novo quando aplicável (ex.: status de “Aberto” para “Em Atendimento”), IP/origem se disponível.
- **Critérios de aceite:**
  - Em cada tela de detalhe de incidente/requisição/etc., existir aba ou seção “Histórico” listando as ações em ordem cronológica.

#### RF-3.2 Histórico de alterações

- **Descrição:** Manter histórico de alterações em campos críticos (serviço afetado, prioridade, SLA, responsável, status) para análise e disputa.
- **Detalhamento:**
  - Versionamento dos campos críticos: valor anterior, valor novo, data, autor.
  - Consulta por entidade (ex.: “histórico do incidente #123”) e, se necessário, por campo e período.
- **Critérios de aceite:**
  - Usuário com permissão pode visualizar linha do tempo de alterações e comparar versões.

#### RF-3.3 Controle de versionamento de dados

- **Descrição:** Quando exigido por compliance, o sistema deve manter versionamento de dados relevantes (ex.: descrição do incidente, decisões de mudança) permitindo recuperar versões anteriores.
- **Detalhamento:**
  - Estratégia por entidade: cópia antes da alteração em tabela de histórico ou uso de padrão event sourcing onde fizer sentido.
  - Política de retenção de versões (quantas manter ou por quanto tempo) configurável.
- **Critérios de aceite:**
  - Dados versionados recuperáveis para auditoria; interface ou API para comparar duas versões.

---

### 2.4 Dashboard com KPIs

#### RF-4.1 Visualização de métricas estratégicas

- **Descrição:** O sistema deve exibir dashboard com métricas estratégicas para gestores e diretoria.
- **Detalhamento:**
  - KPIs sugeridos: **MTTR** (tempo médio até resolução), **MTBF** (tempo médio entre falhas), **percentual de SLA cumprido** (resposta e resolução), **disponibilidade por serviço** (% uptime), **volume de incidentes por período** (tendência).
  - Exibição em cards, gráficos (linha, barra, pizza) e tabelas resumo; possibilidade de mais de um layout de dashboard (por perfil ou personalizável).
- **Critérios de aceite:**
  - Valores calculados de forma consistente (fórmulas documentadas); dados agregados podem vir de cache (ex.: Redis) com TTL definido.

#### RF-4.2 Indicadores operacionais em tempo (quase) real

- **Descrição:** Indicadores operacionais devem ser atualizados em tempo real ou quase real (atualização periódica ou por evento).
- **Detalhamento:**
  - Exemplos: quantidade de incidentes abertos por criticidade; incidentes em risco de SLA; fila por equipe; chamados recém-abertos.
  - Atualização: polling em intervalo curto (ex.: 30 s) ou WebSocket/SSE quando disponível.
- **Critérios de aceite:**
  - Alteração de status ou abertura de incidente refletida no dashboard dentro do intervalo configurado (ex.: &lt; 1 minuto).

#### RF-4.3 Filtros por período

- **Descrição:** Dashboards e relatórios devem permitir filtrar por período (data inicial e final), e opcionalmente por serviço, equipe, criticidade, unidade.
- **Detalhamento:**
  - Períodos pré-definidos: hoje, última 24h, esta semana, este mês, último trimestre, personalizado.
  - Filtros aplicados a todos os widgets do dashboard ou por widget; persistência opcional do último filtro por usuário.
- **Critérios de aceite:**
  - Alteração do período recalcula e exibe apenas dados do intervalo selecionado; indicador claro do período em uso.

#### RF-4.4 Exportação de relatórios

- **Descrição:** O sistema deve permitir exportar relatórios e dados do dashboard em formatos úteis para análise e documentação.
- **Detalhamento:**
  - Formatos: PDF (relatório formatado), CSV/Excel (dados tabulares).
  - Escopo: dashboard atual (gráficos e tabelas no PDF) ou lista de incidentes/requisições filtrada (CSV/Excel).
  - Geração de relatórios pesados em background (fila), com notificação ao usuário quando pronto e link para download.
- **Critérios de aceite:**
  - Arquivo gerado contém dados consistentes com filtros aplicados; arquivos temporários com política de expiração para download.

#### RF-4.5 Atualização dinâmica (real-time ou quase real-time)

- **Descrição:** Dashboards e filas operacionais devem ser atualizáveis dinamicamente sem recarregar a página inteira.
- **Detalhamento:**
  - Atualização por polling (intervalo configurável) ou por push (WebSocket/SSE) quando o back-end suportar.
  - Indicador visual discreto de “última atualização” para o usuário.
- **Critérios de aceite:**
  - Novos incidentes ou mudanças de status aparecem no dashboard dentro do tempo configurado (ex.: &lt; 60 s em modo polling).

---

### 2.5 Gestão de Incidentes

#### RF-5.1 Abertura de incidentes (manual e automática)

- **Descrição:** Incidentes podem ser abertos manualmente por usuário ou analista, ou automaticamente via integração com sistemas de monitoramento.
- **Detalhamento:**
  - **Manual:** formulário com campos obrigatórios (título, descrição, serviço afetado, criticidade, impacto) e opcionais (categoria, item de configuração, anexos). Usuário final pode abrir com dados mínimos; analista pode preencher mais campos.
  - **Automática:** integração (webhook ou consumidor de fila) recebe evento de monitoramento (ex.: servidor down, serviço indisponível) e cria incidente com mapeamento configurável (severidade → criticidade, serviço, descrição padrão).
- **Regras:** Criticidade e impacto podem acionar SLA e regras de escalonamento; serviço afetado pode definir equipe responsável.
- **Critérios de aceite:**
  - Incidente criado manualmente aparece na lista e na fila da equipe; incidente criado por integração identificado como “abertura automática” e com referência ao evento de origem.

#### RF-5.2 Cadastro de criticidade, impacto, serviço e equipe

- **Descrição:** Cada incidente deve ter criticidade, impacto, serviço afetado e equipe responsável (atribuída manualmente ou por regra).
- **Detalhamento:**
  - **Criticidade:** níveis configuráveis (ex.: Crítico, Alto, Médio, Baixo) com impacto no SLA e no escalonamento.
  - **Impacto:** número de usuários/sistemas afetados ou nível (ex.: um serviço, vários, empresa toda).
  - **Serviço afetado:** catálogo de serviços (aplicações, infraestrutura) vinculado a equipes e SLAs.
  - **Equipe responsável:** atribuição inicial por regra (ex.: por serviço) ou manual; reatribuição posterior com histórico.
- **Critérios de aceite:**
  - Alteração de criticidade/impacto pode recalcular prazos de SLA e disparar notificações; alteração de equipe registrada em auditoria.

#### RF-5.3 Workflow de atendimento com estados configuráveis

- **Descrição:** O ciclo de vida do incidente segue um workflow com estados configuráveis (ex.: Aberto, Em Análise, Em Atendimento, Pendente Cliente, Resolvido, Fechado).
- **Detalhamento:**
  - Transições permitidas por estado (ex.: Aberto → Em Análise → Em Atendimento → Resolvido → Fechado); possibilidade de voltar para “Em Atendimento” a partir de Resolvido se problema persistir.
  - Estados configuráveis por instalação (nomes e transições); estado inicial “Aberto” e estados finais “Fechado”/“Cancelado”.
  - Cada mudança de status registrada com data, usuário e comentário opcional.
- **Critérios de aceite:**
  - Apenas transições permitidas são oferecidas na interface; tentativa de transição inválida retorna erro com mensagem clara.

#### RF-5.4 SLA de resposta e resolução por tipo/criticidade

- **Descrição:** Prazos de SLA (tempo para primeira resposta e tempo para resolução) devem ser definidos por tipo de incidente, criticidade e/ou serviço, e aplicados automaticamente ao incidente.
- **Detalhamento:**
  - Regras de SLA: exemplo “Crítico → resposta em 15 min, resolução em 4 h”; “Alto → resposta em 1 h, resolução em 8 h”.
  - Contagem em tempo útil (horário comercial e calendário configuráveis); pausa quando status for “Pendente Cliente” ou equivalente.
  - Exibição no incidente: “SLA de resposta: vence em X” ou “SLA de resposta: estourado em X”; idem para resolução.
- **Critérios de aceite:**
  - Ao criar/alterar incidente, SLA aplicado e prazos exibidos; estouro e risco de estouro disparam eventos para escalonamento e notificação.

---

### 2.6 Requisições de Serviço

#### RF-6.1 Catálogo de serviços padronizado

- **Descrição:** Deve existir um catálogo de serviços padronizados (ex.: acesso a sistema, criação de usuário, mudança de perfil) que o usuário pode solicitar.
- **Detalhamento:**
  - Cadastro de itens de catálogo: nome, descrição, categoria, equipe responsável, SLA padrão, formulário específico (campos extras), fluxo de aprovação (sim/não, aprovadores).
  - Usuário final escolhe um item do catálogo e preenche o formulário; sistema cria requisição com base no template.
- **Critérios de aceite:**
  - Requisição criada a partir do catálogo herda SLA e equipe; campos dinâmicos do formulário armazenados e exibidos no detalhe da requisição.

#### RF-6.2 Fluxos de aprovação e atendimento por tipo

- **Descrição:** Cada tipo de requisição pode ter fluxo próprio de aprovação (um ou mais aprovadores) e de atendimento.
- **Detalhamento:**
  - Estados típicos: Rascunho, Submetida, Em Aprovação, Aprovada, Em Atendimento, Concluída, Rejeitada, Cancelada.
  - Aprovação: sequencial ou paralela; notificação ao aprovador; registro de quem aprovou/rejeitou e quando.
  - Após aprovação, requisição vai para a fila da equipe responsável; atendimento similar ao de incidente (comentários, anexos, conclusão).
- **Critérios de aceite:**
  - Requisição só avança para “Em Atendimento” após aprovação (quando fluxo exige); rejeição notifica solicitante e registra motivo.

---

### 2.7 Problemas e Mudanças

#### RF-7.1 Problemas recorrentes vinculados a incidentes

- **Descrição:** O sistema deve permitir registrar problemas (causa raiz de vários incidentes) e vincular múltiplos incidentes a um problema.
- **Detalhamento:**
  - Cadastro de problema: título, descrição, causa raiz, plano de ação, status (Aberto, Em Análise, Resolvido, Fechado), responsável.
  - Vínculo: de incidente para problema (um incidente pode estar vinculado a um problema) e de problema para incidentes (lista de incidentes relacionados).
  - Histórico e auditoria nas alterações do problema.
- **Critérios de aceite:**
  - Na tela do incidente, usuário pode associar a um problema existente ou criar novo; na tela do problema, lista de incidentes vinculados é exibida e atualizável.

#### RF-7.2 Documentação de causa raiz e plano de ação

- **Descrição:** Para cada problema, deve ser possível documentar causa raiz e plano de ação (e acompanhar execução).
- **Detalhamento:**
  - Campos: causa raiz (texto ou estruturado), plano de ação (itens com responsável e prazo), resultado (após implementação).
  - Opcional: template de análise (ex.: 5 porquês) e campos customizáveis.
- **Critérios de aceite:**
  - Dados persistidos e exibidos no detalhe do problema; inclusão em relatórios e exportação quando aplicável.

#### RF-7.3 Mudanças (Change Management) com janela, risco e aprovação

- **Descrição:** Mudanças planejadas devem ser registradas com janela de execução, classificação de risco, plano de rollback e fluxo de aprovação.
- **Detalhamento:**
  - Campos: título, descrição, justificativa, tipo (padrão, normal, emergencial), risco (baixo, médio, alto), janela (data/hora início e fim), plano de rollback, aprovadores, vínculo com incidentes/problemas que motivaram a mudança.
  - Workflow: Rascunho → Submetida → Em Aprovação → Aprovada/Rejeitada → Agendada → Em Execução → Concluída/Rollback.
  - Aprovação conforme política (ex.: mudança de alto risco exige CAB).
- **Critérios de aceite:**
  - Mudança só pode ser executada na janela aprovada; alteração de janela ou risco pode exigir nova aprovação (regra configurável).

---

### 2.8 Controle de SLA e Escalonamento

#### RF-8.1 Definição de SLAs por tipo, criticidade, cliente ou serviço

- **Descrição:** Regras de SLA devem ser configuráveis por tipo de chamado (incidente/requisição), criticidade, cliente (ou contrato) e serviço.
- **Detalhamento:**
  - Cadastro de política de SLA: condições (tipo, criticidade, serviço, cliente), tempo para primeira resposta, tempo para resolução, calendário de tempo útil.
  - Resolução de conflito quando várias regras se aplicam (ex.: mais restritiva ou prioridade por ordem).
- **Critérios de aceite:**
  - Ao criar/atualizar chamado, sistema aplica a regra correta e exibe prazos; alteração da regra não altera retroativamente chamados já criados (opcional: recalcular).

#### RF-8.2 Contagem em tempo útil (calendário e horário de atendimento)

- **Descrição:** A contagem do SLA deve considerar apenas tempo útil (horário comercial e dias úteis), configurável por calendário.
- **Detalhamento:**
  - Calendário: dias da semana e feriados; horário de atendimento (ex.: 8h–18h). Fora desse período o cronômetro do SLA não avança.
  - Possibilidade de pausar SLA em status como “Pendente Cliente” ou “Aguardando Terceiros”.
- **Critérios de aceite:**
  - Cálculo de “vence em” e “estourado em” consistente com o calendário; testes com cenários de fim de semana e feriado.

#### RF-8.3 Escalonamento por tempo, SLA e criticidade

- **Descrição:** O sistema deve escalar chamados automaticamente com base em tempo sem atendimento, proximidade de estouro de SLA e criticidade/impacto.
- **Detalhamento:**
  - Regras de escalonamento: ex.: “sem primeira resposta em X minutos” ou “a Y% do prazo de resolução” ou “criticidade crítica” → notificar gestor, reatribuir para equipe de nível 2, enviar alerta.
  - Ações: notificação (e-mail, Slack, Teams), reatribuição, mudança de prioridade; execução por worker assíncrono (mensageria).
- **Critérios de aceite:**
  - Eventos de “risco de SLA” e “SLA estourado” publicados na fila; worker aplica regras e notifica; histórico de escalonamentos registrado.

#### RF-8.4 Alertas por e-mail, Slack/Teams ou outros canais

- **Descrição:** Alertas e notificações devem ser enviados por canais configuráveis: e-mail, Slack, Teams, webhook genérico.
- **Detalhamento:**
  - Configuração por tipo de evento: novo chamado, mudança de status, comentário, risco de SLA, estouro de SLA, escalonamento.
  - Destinatários por regra: responsável, equipe, gestor, lista customizada.
  - Template de mensagem configurável (assunto, corpo, variáveis como número do chamado, título, link).
- **Critérios de aceite:**
  - Envio realizado de forma assíncrona (fila); falha de envio registrada e opção de retry/DLQ; usuário recebe notificação no canal configurado.

---

### 2.9 Integrações Externas

#### RF-9.1 Recebimento de dados (webhook/API)

- **Descrição:** O sistema deve receber dados de sistemas externos via API ou webhook (ex.: eventos de monitoramento) para criação automática de incidentes ou atualização de status.
- **Detalhamento:**
  - Endpoint seguro (autenticação por API key ou OAuth2) e contrato documentado (payload esperado).
  - Validação do payload; em caso de erro, retorno HTTP adequado e log do evento para reprocessamento.
  - Mapeamento configurável: campo externo → campo interno (serviço, criticidade, descrição).
- **Critérios de aceite:**
  - Evento válido gera incidente ou atualização; evento inválido retorna 400/422 e não persiste dado inconsistente.

#### RF-9.2 Envio de dados para sistemas externos

- **Descrição:** O sistema deve poder enviar dados para sistemas externos (ERP, CRM, diretório) quando configurado.
- **Detalhamento:**
  - Ações que disparam envio: criação/atualização de chamado, mudança de status, conclusão; configuração por tipo de evento e endpoint.
  - Autenticação (API key, OAuth2), timeout e retry configuráveis; logs de requisição/resposta para diagnóstico.
- **Critérios de aceite:**
  - Integração ativada envia payload no formato combinado; falha não bloqueia o fluxo principal e gera registro para retry ou DLQ.

#### RF-9.3 Logs de integração, tratamento de falhas, timeout e retry

- **Descrição:** Todas as integrações devem ser logadas; falhas tratadas com timeout, retry e, quando aplicável, dead-letter queue.
- **Detalhamento:**
  - Log: timestamp, direção (entrada/saída), endpoint, payload (mascarado se sensível), resposta, código HTTP, tempo de resposta.
  - Timeout configurável por integração; retry com backoff; após N falhas, mensagem para DLQ e alerta para equipe.
- **Critérios de aceite:**
  - Administrador ou suporte consegue consultar logs de integração e reprocessar itens em DLQ quando possível.

---

### 2.10 Infraestrutura e Processamento Assíncrono (visão funcional)

#### RF-10.1 Jobs em background e filas

- **Descrição:** Tarefas pesadas ou que não precisam de resposta imediata devem ser processadas em background via filas (ex.: RabbitMQ).
- **Detalhamento:**
  - Exemplos: geração de relatório, envio em massa de e-mails, sincronização com diretório, cálculo de KPIs, criação de incidentes a partir de fila de eventos.
  - Usuário que solicita relatório recebe confirmação “Relatório em geração” e depois notificação com link para download (ou lista de “meus relatórios”).
- **Critérios de aceite:**
  - Job executado pelo worker dentro do tempo esperado; falha registrada e retry conforme política; DLQ para itens não processados após N tentativas.

#### RF-10.2 Retry e dead-letter queue

- **Descrição:** Mensagens que falham no processamento devem ter retry automático e, após esgotar tentativas, serem enviadas a uma dead-letter queue (DLQ).
- **Detalhamento:**
  - Política de retry: número máximo de tentativas, intervalo ou backoff exponencial.
  - DLQ para inspeção manual, correção e reprocessamento ou descarte; alerta opcional quando mensagem cai na DLQ.
- **Critérios de aceite:**
  - Mensagem na DLQ não é reprocessada automaticamente; ferramenta ou tela administrativa permite reprocessar ou descartar.

---

## 3. Resumo dos Requisitos Funcionais por Módulo

| Módulo | Requisitos |
|--------|------------|
| **Gestão de Usuários** | RF-1.1 a RF-1.7 (cadastro, edição, exclusão/desativação, RBAC, autenticação, recuperação de senha, sessão) |
| **Controle de Acesso** | RF-2.1 a RF-2.3 (autorização por papel, permissões por módulo, logs de acesso) |
| **Auditoria** | RF-3.1 a RF-3.3 (registro de ações, histórico de alterações, versionamento) |
| **Dashboard e KPIs** | RF-4.1 a RF-4.5 (métricas estratégicas, operacionais, filtros, exportação, atualização dinâmica) |
| **Incidentes** | RF-5.1 a RF-5.4 (abertura manual/automática, criticidade/impacto/serviço/equipe, workflow, SLA) |
| **Requisições** | RF-6.1 a RF-6.2 (catálogo, fluxos de aprovação e atendimento) |
| **Problemas e Mudanças** | RF-7.1 a RF-7.3 (problemas vinculados a incidentes, causa raiz/plano de ação, mudanças com janela/risco/aprovação) |
| **SLA e Escalonamento** | RF-8.1 a RF-8.4 (definição de SLA, tempo útil, escalonamento, alertas) |
| **Integrações** | RF-9.1 a RF-9.3 (recebimento, envio, logs e tratamento de falhas) |
| **Processamento assíncrono** | RF-10.1 a RF-10.2 (jobs em background, retry e DLQ) |

---

## 4. Referências

- **RequisitosCorp.md** – Requisitos para um Sistema Corporativo (gestão de usuários, controle de acesso, auditoria, dashboard, segurança, microsserviços, mensageria, integrações).
- **visãogeral.md** – Visão Geral do Projeto (objetivos, stakeholders, escopo funcional, arquitetura, microsserviços, banco de dados, mensageria).

Este documento deve ser utilizado como base para especificação técnica, estimativa de esforço e critérios de aceite em testes funcionais.
