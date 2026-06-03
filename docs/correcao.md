## 5.2.1 Frontend

A interface do **Telemedicina Para Todos** é construída com **Vue.js 3**, usando a **Composition API** (`<script setup>`, composables e reatividade nativa do Vue). O código é escrito em **TypeScript**, o que traz tipagem estática aos componentes, stores e utilitários.

A comunicação com o backend não passa por uma API REST separada para cada tela. O **Inertia.js** (adaptador Vue 3) recebe do Laravel as páginas já montadas com os dados necessários (props) e atualiza a interface sem recarregar o documento inteiro — modelo de SPA híbrida integrada ao servidor.

O empacotamento e o ambiente de desenvolvimento usam **Vite 7**, com o plugin oficial do Laravel para publicar os assets em produção e suporte a hot reload durante o desenvolvimento.

Para estilos, o projeto adota **Tailwind CSS 4** (classes utilitárias e design system do projeto). Os componentes de interface reutilizáveis vêm do **Reka UI** (dialogs, menus, campos, etc.), e os ícones são do **Lucide Vue**. Classes compostas usam **clsx** e **tailwind-merge**; animações complementares com **tw-animate-css**.

O estado compartilhado entre telas (por exemplo, o fluxo de videoconferência) fica em stores **Pinia**. Lógica reativa comum (listeners, timers, helpers de DOM) é centralizada com **VueUse**.

As rotas e URLs usadas no frontend são geradas de forma tipada pelo **Laravel Wayfinder**, alinhadas às rotas definidas no Laravel.

Para tempo real, o frontend usa **Laravel Echo** com o pacote **@laravel/echo-vue**, conectado ao **Laravel Reverb** por WebSocket — mensagens, notificações e eventos de consulta/videochamada. A videoconferência em si usa o **mediasoup-client** no navegador, que se comunica com o servidor SFU (MediaSoup) para áudio e vídeo via WebRTC.

Animações leves (estados vazios, feedback visual) podem usar **DotLottie Vue** (`@lottiefiles/dotlottie-vue`).

A estrutura do código segue pastas por responsabilidade: páginas Inertia em `resources/js/pages/` (áreas Doctor, Patient, autenticação e configurações), layouts em `layouts/`, componentes em `components/`, composables em `composables/` e stores em `stores/`. Os estilos globais ficam em `resources/css/app.css`.

## 5.2.2 Backend

O servidor da aplicação é implementado em **PHP 8.2+** sobre o framework **Laravel 12**, que concentra autenticação web, regras de negócio, persistência e orquestração dos demais serviços da plataforma. A interface principal é entregue pelo adaptador **Inertia Laravel**, que monta as respostas para o Vue sem expor uma API REST dedicada a cada tela.

O fluxo de uma requisição web segue camadas bem definidas:

- **Controllers:** recebem HTTP, validam entrada via **Form Requests**, aplicam **Policies** de autorização e delegam aos Services; retornam `Inertia::render()` ou JSON quando for API de parceiros.
- **Services:** concentram a lógica de negócio (agendamentos, prontuário, disponibilidade, documentos clínicos, etc.) e orquestram os Models.
- **Models (Eloquent):** representam entidades, relacionamentos, casts e scopes; o esquema do banco é versionado em **migrations** em `database/migrations/`.
- **Events, Observers e Jobs:** desacoplam efeitos colaterais (notificações, PDF, integrações, videoconferência); tarefas pesadas ou demoradas vão para fila.
- **Policies:** garantem que médico, paciente ou parceiro só acessem recursos permitidos (prontuário, consulta, documentos).

A persistência usa **PostgreSQL** (principal) ou **MySQL** em ambientes alternativos, sempre via **Eloquent ORM**. Cache e sessão podem usar **Redis** (**Predis**). Filas assíncronas usam **RabbitMQ** (driver `laravel12-queue-rabbitmq`). Arquivos clínicos e anexos vão para armazenamento compatível com **S3** (**Flysystem AWS S3** / MinIO em desenvolvimento).

Para tempo real, o **Laravel Reverb** expõe WebSockets usados pelo Echo no frontend (mensagens, status de consulta, eventos de videochamada). A geração de PDFs de documentos clínicos usa **DomPDF**; tratamento de imagens (avatars e uploads) usa **Intervention Image**. Notificações no navegador podem usar **Web Push** (VAPID). A API REST pública para laboratórios e parceiros é documentada com **L5-Swagger** (OpenAPI).

Integrações externas (RNDS/FHIR, laboratórios, webhooks) ficam em `app/Integrations/`, com **Adapters**, **DTOs**, **Mappers** e **Jobs** dedicados, separados do núcleo das telas Inertia. Rotas web em `routes/web/` e `routes/auth/`; API de parceiros em `routes/api.php`; canais de broadcast em `routes/channels.php`.

A organização do código em `app/` agrupa responsabilidades por domínio:

- `Http/Controllers/` — Auth, Doctor, Patient, Settings, VideoCall e endpoints de API.
- `Services/` — regras de negócio reutilizáveis.
- `Models/`, `Policies/`, `Http/Requests/` — domínio, autorização e validação.
- `Jobs/`, `Events/`, `Listeners/`, `Observers/` — processamento assíncrono e reações a mudanças.
- `Integrations/` — interoperabilidade com sistemas de saúde e parceiros.
- `Contracts/` e providers — interfaces e injeção de dependência (ex.: assinatura digital, push).

Configurações por ambiente e feature flags ficam em `config/`; variáveis sensíveis apenas em `.env`.

## 5.2.3 Banco de Dados

O projeto combina **banco relacional** para dados transacionais e **armazenamento não relacional** para desempenho e infraestrutura auxiliar.

**Relacional:** **PostgreSQL 16** é o SGBD principal (usuários, consultas, prontuário, integrações). Em desenvolvimento ou ambientes legados pode-se usar **MySQL 8** ou **SQLite**. O acesso é feito pelo **Eloquent ORM**; o esquema evolui via migrations em `database/migrations/`.

**Não relacional:** **Redis** armazena cache, sessões e, conforme configuração, filas de curta duração — dados em memória, sem modelo relacional fixo. Documentos e anexos clínicos ficam em **armazenamento de objetos** (MinIO/S3), fora das tabelas do banco relacional.

Diagrama do modelo de dados: `docs/layers/persistence/database/diagrama_banco_dados.md`.

## 5.2.4 Ferramentas de Apoio

Ferramentas que sustentam desenvolvimento, qualidade e operação do projeto, sem fazer parte do runtime da aplicação:

- **Versionamento:** **Git** e **GitHub** para histórico de código, branches e revisão.
- **Dependências:** **Composer** (PHP) e **npm** (JavaScript) para instalar e versionar bibliotecas.
- **Ambiente local:** **Docker Compose** sobe PostgreSQL, Redis, RabbitMQ e MinIO; o script `composer run dev` orquestra servidor PHP, Vite, filas e Reverb. **Laravel Sail** é alternativa documentada para quem prefere o fluxo oficial Docker do Laravel.
- **Qualidade de código:** **ESLint** e **Prettier** no frontend; **Laravel Pint** no PHP; **vue-tsc** para checagem de tipos Vue/TS. **Husky**, **lint-staged** e **Commitlint** padronizam commits (Conventional Commits).
- **Testes:** **PHPUnit** para testes automatizados do backend (`php artisan test`).
- **API e integrações:** **L5-Swagger** gera e expõe a documentação OpenAPI; **Postman** ou **Insomnia** para testar endpoints de parceiros e OAuth.
- **Produção (referência):** servidor web **Nginx** com **PHP-FPM**, HTTPS e proxy para WebSockets do Reverb.

Documentação de instalação e comandos: `docs/setup/Start.md`.

## 5.2.5 Padrões Adotados

O backend segue o **MVC do Laravel** estendido por uma **camada de Services**: controllers permanecem enxutos (validar, autorizar, delegar, responder); a lógica de negócio fica em classes como `AppointmentService` e `MedicalRecordService`. O acesso a dados é feito pelos **Models Eloquent** — não há camada Repository explícita em todo o projeto; os Services consultam e persistem via Eloquent diretamente.

Padrões recorrentes na aplicação:

- **Form Requests:** validação e autorização de entrada antes de chegar ao Service.
- **Policies:** autorização por recurso (prontuário, consulta, documentos), alinhada ao perfil médico/paciente/parceiro.
- **Injeção de dependência:** o container Laravel resolve dependências por construtor; interfaces em `app/Contracts/` permitem trocar implementações (ex.: assinatura digital **A1** vs implementação nula em desenvolvimento).
- **Adapter:** integrações com laboratórios e FHIR usam adaptadores em `app/Integrations/Adapters/`, isolando APIs externas do núcleo da aplicação.
- **Presenter:** dados sensíveis ou complexos são formatados antes de ir ao Inertia (`MedicalRecordPresenter`, `NotificationPresenter`), evitando expor models inteiros ao frontend.
- **Observer e Event/Listener/Job:** reações a mudanças de estado (agendamentos, documentos) e trabalho assíncrono (PDF, filas, broadcast via Reverb).
- **Factory:** criação padronizada de notificações e objetos repetitivos quando aplicável.
- **DDD Light:** pastas por domínio funcional (Doctor, Patient, Integrations, LGPD) dentro da estrutura Laravel, sem separação física rígida em camadas `Domain/Application`.

No frontend, o padrão principal é **Composition API** com componentes por página Inertia, composables para lógica compartilhada e **Pinia** quando o estado precisa ultrapassar uma única tela (ex.: videoconferência).

Convenções detalhadas: `docs/layers/architecture-governance/Architecture/DevGuide.md`.

## 5.2.9 Caracterização da API

A plataforma expõe **dois perfis de interface**, com contratos distintos:

**Interface principal (aplicação web):** não é uma API REST consumida pelo Vue tela a tela. O **Inertia.js** entrega páginas com props em respostas HTTP normais; autenticação por **sessão** (cookie), **CSRF** e middleware de perfil (`doctor`, `patient`). Formulários e navegação usam os verbos HTTP do Laravel (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) sem prefixo `/api/v1` nem envelope JSON padronizado — a resposta é o componente Vue e seus dados.

**API pública REST (parceiros externos):** voltada a laboratórios, farmácias e integradores de saúde. Prefixo **`/api/v1/public`**, corpo em **JSON**, estilo **REST**. Autenticação **OAuth2** (`POST /oauth/token`) com **Bearer token**, **scopes** por operação e **rate limiting**. Webhooks inbound (`POST /webhooks/lab/{partnerSlug}`) validam assinatura **HMAC**, sem OAuth — o parceiro envia resultados para a plataforma. Rotas autenticadas incluem consulta de pedidos de exame e health check da integração.

A documentação da API pública segue **OpenAPI 3.x**, gerada com **L5-Swagger** (`php artisan l5-swagger:generate`), consultável em **Swagger UI** (`/api/documentation`) e **ReDoc** (`/redoc`). Erros da API retornam JSON com mensagem e código HTTP; a interface Inertia trata validação com erros de campo (422) integrados ao formulário.

Não há **GraphQL** no projeto. Tempo real (mensagens, consultas, videochamada) usa **WebSockets** (Reverb/Echo), fora do contrato REST.

---

# 6 MANUAL DO USUÁRIO

## 6.1 Apresentação

O **Telemedicina Para Todos** é uma plataforma web que permite consultas de saúde à distância. Existem dois perfis de uso: **paciente** (quem busca atendimento) e **médico** (quem realiza consultas e registra informações clínicas). Cada perfil possui menu e telas próprias após o login.

Este manual descreve, em linguagem simples, como acessar o sistema e executar as tarefas mais comuns. Recomenda-se complementar o texto com **capturas de tela** numeradas no documento final (PDF), indicando botões e campos com setas ou destaque em negrito.

## 6.2 Requisitos para usar o sistema

- Navegador atualizado: **Chrome**, **Firefox**, **Edge** ou **Safari**, com JavaScript habilitado.
- Conexão estável com a internet.
- Para videoconferência: computador ou celular com **câmera** e **microfone**; ao entrar na consulta, permitir o uso desses dispositivos quando o navegador solicitar.
- Resolução de tela recomendada: mínimo **1024×768**; ideal **1366×768** ou superior.

## 6.3 Acesso, cadastro e senha

### 6.3.1 Entrar no sistema

1. Abra o endereço da plataforma no navegador.
2. Clique em **Entrar** (ou acesse a página de login).
3. Informe **e-mail** e **senha** cadastrados.
4. Clique em **Entrar**. O sistema direciona automaticamente para a área do **médico** ou do **paciente**, conforme o tipo de conta.

### 6.3.2 Cadastrar-se como paciente

1. Na página inicial, escolha o cadastro de **paciente**.
2. Preencha os dados obrigatórios (nome, e-mail, senha, data de nascimento, telefone e demais campos solicitados).
3. Aceite os **Termos de Uso**, a **Política de Privacidade** e o **TCLE** (Termo de Consentimento), quando exibidos.
4. Conclua o cadastro. Se o sistema pedir **confirmação de e-mail**, acesse o link enviado à sua caixa de entrada antes de agendar consultas.
5. Complete o **contato de emergência** no perfil, se ainda não estiver preenchido — em muitos fluxos isso é necessário para agendar.

### 6.3.3 Cadastrar-se como médico

1. Escolha o cadastro de **médico**.
2. Informe dados pessoais, **CRM** (ou registro profissional) e **especialidades**.
3. Finalize o cadastro e confirme o e-mail, se solicitado.
4. Após o login, configure a **agenda** e os **horários disponíveis** para que pacientes possam marcar consultas.

### 6.3.4 Esqueci minha senha

1. Na tela de login, clique em **Esqueci minha senha**.
2. Digite o e-mail da conta.
3. Siga o link recebido por e-mail e defina uma nova senha.

## 6.4 Área do paciente

Após o login, o menu lateral principal inclui: **Dashboard**, **Pesquisar Médicos**, **Videoconferência**, **Mensagens**, **Histórico de Consultas** e **Prontuário**.

### 6.4.1 Dashboard

Na página inicial do paciente você vê resumo de **próximas consultas**, médicos em destaque e atalhos. Use o dashboard para ir rapidamente à consulta do dia ou buscar um médico.

### 6.4.2 Pesquisar médicos e agendar consulta

1. Clique em **Pesquisar Médicos**.
2. Use a busca ou os filtros (especialidade, nome) para encontrar o profissional.
3. Abra o perfil do médico para ver informações e horários.
4. Escolha **Agendar consulta** (ou fluxo equivalente na tela).
5. Selecione **data** e **horário** entre os disponíveis.
6. Confirme o agendamento. O sistema pode impedir o agendamento se faltar contato de emergência ou se o horário já estiver ocupado.

### 6.4.3 Consultas agendadas e histórico

- **Próxima consulta:** atalho para a consulta mais próxima no tempo.
- **Histórico de Consultas:** lista consultas passadas e futuras; abra os **detalhes** para ver status, médico, data e ações permitidas (cancelar ou reagendar, quando disponíveis).

### 6.4.4 Participar da consulta por vídeo

1. No horário da consulta, acesse **Videoconferência** ou o atalho na consulta em andamento.
2. Permita **câmera** e **microfone** no navegador.
3. Aguarde a conexão com o médico. Use os controles na tela para silenciar áudio, desligar vídeo ou encerrar a chamada, conforme os botões exibidos.
4. Se a consulta foi **agendada**, entre pela sala vinculada à consulta; chamadas fora do fluxo seguem as regras de disponibilidade do sistema.

### 6.4.5 Mensagens

1. Abra **Mensagens**.
2. Selecione a conversa com o médico (ou contato listado).
3. Digite o texto e envie. Novas mensagens podem aparecer em tempo real sem atualizar a página.

### 6.4.6 Prontuário (visão do paciente)

1. Clique em **Prontuário**.
2. Consulte registros liberados para você: anotações, prescrições, atestados, exames e documentos anexados, conforme o que o médico registrou e as regras de privacidade.
3. Quando disponível, use **exportar** ou **baixar documento** para obter cópia em PDF dos itens permitidos.
4. Em registros versionados (ex.: prescrição), pode existir opção de ver **histórico de versões**.

## 6.5 Área do médico

O menu do médico inclui: **Dashboard**, **Agenda**, **Pacientes**, **Videoconferência**, **Mensagens**, **Histórico**, **Documentos** (emissão e histórico) e **Integrações**.

### 6.5.1 Dashboard

Exibe **consultas do dia**, próximos atendimentos e indicadores resumidos. A partir daqui o médico acessa rapidamente uma consulta em andamento ou pendente.

### 6.5.2 Configurar agenda e disponibilidade

1. Abra **Agenda**.
2. Cadastre **locais de atendimento** (teleconsulta, consultório, etc.), se aplicável.
3. Defina **horários disponíveis** (slots recorrentes ou datas específicas).
4. Marque **datas bloqueadas** em que não atenderá.
5. Salve as alterações para que os pacientes vejam horários livres na busca.

### 6.5.3 Pacientes e prontuário

1. Em **Pacientes**, localize o paciente pela lista ou busca.
2. Abra **Detalhes** para dados cadastrais e histórico resumido.
3. Entre em **Prontuário** do paciente para registrar ou consultar:
   - diagnósticos;
   - prescrições;
   - pedidos de exame;
   - anotações clínicas;
   - atestados;
   - sinais vitais;
   - documentos anexados.
4. Salve cada registro após preencher os campos obrigatórios. Alterações sensíveis podem gerar **nova versão** auditável.

### 6.5.4 Realizar e registrar uma consulta

1. Na **Dashboard**, no **Histórico** ou na **Agenda**, abra a consulta desejada.
2. Clique em **Iniciar consulta** (ou equivalente) para mudar o status para em andamento.
3. Registre evolução, prescrições e documentos no prontuário durante ou após o atendimento.
4. Use **Salvar rascunho** se precisar interromper sem finalizar.
5. Ao concluir, **Finalize** a consulta para encerrar o atendimento formalmente.
6. Gere **PDF** da consulta ou documentos, quando o botão estiver disponível.

### 6.5.5 Videoconferência (médico)

Mesmo fluxo do paciente: menu **Videoconferência**, permissão de mídia e entrada na sala da consulta agendada. O médico pode **aceitar** ou **recusar** solicitações de chamada, conforme as opções exibidas na tela.

### 6.5.6 Documentos clínicos

- **Documentos → Emissão:** criar ou emitir documentos previstos pelo sistema (atestados, laudos, etc., conforme telas disponíveis).
- **Documentos → Histórico:** consultar documentos já emitidos e **baixar** cópias autorizadas.

Documentos assinados digitalmente podem ser **verificados** por código em página pública de verificação (`/verify/{código}`), quando o sistema gerar código de autenticidade.

### 6.5.7 Integrações com parceiros

Em **Integrações**, o médico pode:

- ver o **hub** de integrações ativas;
- **gerenciar parceiros** (laboratórios, etc.);
- **conectar** um novo parceiro seguindo o assistente na tela;
- consultar status e métricas da integração, quando habilitado.

Essa área é voltada ao profissional que envia pedidos de exame ou recebe resultados de sistemas externos.

### 6.5.8 Mensagens

Igual à área do paciente: lista de conversas, envio de texto e leitura em tempo real.

## 6.6 Configurações da conta (médico e paciente)

Acesse o menu do usuário (canto superior) e escolha **Configurações**:

- **Perfil:** alterar nome, foto (avatar), telefone, timeline profissional (médico) e demais dados permitidos.
- **Senha:** informar senha atual e nova senha; salvar.
- **Notificar Bug:** enviar relato de problema encontrado na plataforma (opcional).

Alterações de perfil exigem **Salvar** para valer.

## 6.7 Notificações

O ícone de notificações (quando visível) lista avisos de consulta, mensagens ou integrações. Marque como lidas individualmente ou use **marcar todas como lidas**. O navegador pode pedir permissão para **notificações push** — aceite apenas se desejar alertas fora da aba aberta.

## 6.8 Glossário de mensagens comuns

- **E-mail já usado:** ao cadastrar, use outro e-mail ou recupere a senha da conta existente.
- **E-mail não confirmado:** confirme o cadastro pelo link enviado antes de agendar.
- **Contato de emergência ausente:** complete o perfil em **Configurações** para liberar agendamento.
- **Horário indisponível:** escolha outra data/hora ou outro médico.
- **Acesso negado:** verifique se entrou com o perfil correto (paciente ou médico).
- **Vídeo não inicia:** permita câmera e microfone; teste outro navegador ou conexão.
- **Campos obrigatórios:** preencha todos os campos destacados antes de salvar.

## 6.9 Perguntas frequentes (FAQ)

**Não recebi o e-mail de confirmação.** Verifique a pasta de spam. Solicite reenvio na tela de verificação de e-mail, se disponível.

**Esqueci minha senha.** Use o link **Esqueci minha senha** na tela de login.

**Não consigo agendar consulta.** Confirme e-mail, contato de emergência e se há horários livres na agenda do médico.

**O vídeo não abre.** Atualize o navegador, permita câmera e microfone e feche outros programas que usem a câmera.

**Onde vejo meu prontuário?** Paciente: menu **Prontuário**. Médico: **Pacientes** → selecionar paciente → **Prontuário**.

**Como cancelar ou remarcar?** Abra os **detalhes da consulta** no histórico ou no dashboard e use **Cancelar** ou **Reagendar**, se o botão aparecer para o status atual.

## 6.10 Primeiro acesso e tour

Na primeira entrada, o sistema pode exibir **boas-vindas** ou um **tour** pelos menus principais. Siga as etapas na tela ou clique em **Pular** para ir direto ao dashboard. O tour pode ser concluído depois pelas dicas de ajuda (?), quando existirem na interface.
