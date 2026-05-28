# F1-03 — Notificação mínima funcional

- Prioridade: `P0`
- Esforço: `M`
- Owner sugerido: Identity + Notification
- Dependências: `F1-08`

## Objetivo

Ativar envio real de e-mail transacional para recuperação de senha e evento crítico operacional.

## Escopo

- Canal de e-mail no `notification-service`.
- Integração com fluxo de recuperação de senha no `identity-service`.
- Template mínimo e observabilidade de envio.

## Tarefas técnicas

- Implementar adapter de envio (SMTP/API provider definido em `F1-08`).
- Tratar timeout/retry básico e status de falha.
- Instrumentar logs sem vazamento de segredo.
- Adicionar testes de integração com stub de provider.

## Critérios de aceite

- Fluxo de recuperação de senha dispara e-mail em homologação.
- Ao menos um evento crítico gera notificação de e-mail.
- Falhas de envio não derrubam request principal.

## Riscos

- Configuração de provedor inconsistente por ambiente.
- Bloqueio por SPF/DKIM ainda não configurado.

## Evidências esperadas

- Configuração documentada por ambiente.
- Testes e log de envio em homologação.

## Evidência atual (2026-05-27)

- `identity-service`: fluxo `forgotPassword` agora despacha notificação de recuperação via `passwordRecoveryNotifier` sem derrubar o request em caso de falha.
- `identity-service`: adapter HTTP para `notification-service` com JWT de serviço e permissão `notifications:manage:all`.
- `identity-service`: resposta de recuperação mantém mensagem uniforme e dispatch assíncrono para reduzir enumeração por timing.
- `notification-service`: envio SMTP via Nodemailer para notificações `type=email`, com marcação de status `sent/failed` no repositório.
- `notification-service`: suporte a STARTTLS (`SMTP_REQUIRE_TLS`) e fail-fast de configuração SMTP inválida em produção.
- `request-service`: eventos `request.created` e `request.submitted` incluem `requesterEmail` quando há réplica de usuário disponível, permitindo notificação transacional ao solicitante.
- `notification-service`: consumer de eventos `request.*` gera e-mail para `request.submitted` quando o payload contém `requesterEmail`, além da notificação in-app.
- `notification-service`: evidência automatizada de SMTP real em `packages/notification-service/src/adapters/driven/email/smtp-email-sender.adapter.integration.spec.ts`, com servidor SMTP sandbox local em processo e recebimento da mensagem via socket TCP.
- `notification-service`: o mesmo teste exercita `CreateNotificationUseCase` com adapter SMTP real e repositório fake, validando transição para `sent`.
- Segurança: token bruto de reset não é persistido no `body`; conteúdo sensível usa `deliveryBody` transitório para envio e o registro salvo fica redigido.
- Variáveis de ambiente de e-mail padronizadas em `.env.example` e `packages/notification-service/.env.example`.
- Validação local:
  - `pnpm --filter identity-service test` e `pnpm --filter identity-service build` verdes.
  - `pnpm --filter notification-service test` verde (`7` arquivos, `35` testes).
  - `pnpm --filter notification-service test:integration` verde fora do sandbox (`2` arquivos, `14` testes), incluindo `SmtpEmailSenderAdapter` com SMTP sandbox local.
  - `pnpm --filter notification-service build` verde.
  - `pnpm --filter request-service test`, `pnpm --filter request-service build` e `pnpm --filter request-service test:integration` verdes (`36` testes de integração).
  - `pnpm --filter shared test`, `pnpm --filter shared build` e `pnpm test:contract` verdes.

## Status de fechamento

- Feito para o escopo Fase 1: há evidência automatizada, determinística e sem credencial externa de que o `notification-service` conecta por SMTP, entrega a mensagem a um servidor sandbox e dispara e-mail para um evento crítico (`request.submitted`).
- Não cobre reputação de domínio, SPF/DKIM ou entrega em provedor externo de produção; esses pontos permanecem fora do aceite mínimo de Fase 1 e pertencem à operação/provedor.
