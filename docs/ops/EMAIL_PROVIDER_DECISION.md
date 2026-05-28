# F1-08 — Decisão Operacional de Provedor de E-mail

Data: 2026-05-26  
Status: Aprovado para implementação  
Relacionados: `docs/issues/fase-1/F1-08-provedor-email.md`, `docs/issues/fase-1/F1-03-notificacao-minima-funcional.md`

## Decisão

Adotar **Brevo SMTP Relay** como provedor primário de e-mails transacionais (recuperação de senha e alertas críticos), com **modo de desenvolvimento local desacoplado** e fallback por fila/retry no fluxo assíncrono.

## Justificativa

- Mantém a implementação atual baseada em SMTP, sem acoplar o `notification-service` a uma API proprietária.
- Usa provedor transacional dedicado, com credenciais próprias de SMTP e gestão de remetentes/domínio.
- Permite trocar o relay SMTP no futuro sem alterar contratos internos nem payloads de notificação.
- Permite validar entrega real em homologação/produção usando o mesmo adapter já coberto por testes.

## Configuração por ambiente

- `local`: SMTP de desenvolvimento (sandbox local ou servidor de teste), sem uso de credenciais de produção.
- `homolog`: Brevo SMTP Relay com credenciais dedicadas do ambiente.
- `prod`: Brevo SMTP Relay com segredo gerenciado fora do repositório.

## Variáveis de ambiente padrão

- `EMAIL_PROVIDER=smtp`
- `EMAIL_FROM_ADDRESS` (ex.: `noreply@empresa.com`)
- `EMAIL_FROM_NAME` (ex.: `PGIC`)
- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_REQUIRE_TLS=true`
- `SMTP_USERNAME` (login SMTP gerado no painel da Brevo)
- `SMTP_PASSWORD` (chave/senha SMTP gerada no painel da Brevo)
- `SMTP_CONNECTION_TIMEOUT_MS` (default recomendado: `10000`)
- `SMTP_MESSAGE_TIMEOUT_MS` (default recomendado: `15000`)

Observação: todos os segredos (`SMTP_USERNAME`, `SMTP_PASSWORD`) devem ser injetados por cofre/secret manager do ambiente.
Em produção, `EMAIL_PROVIDER` deve estar definido; quando `EMAIL_PROVIDER=smtp`, `SMTP_HOST` e `EMAIL_FROM_ADDRESS` são obrigatórios no boot.

## Configuração Brevo recomendada

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM_ADDRESS=noreply@seudominio.com
EMAIL_FROM_NAME=PGIC
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USERNAME=<brevo-smtp-login>
SMTP_PASSWORD=<brevo-smtp-key>
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_MESSAGE_TIMEOUT_MS=15000
```

Notas operacionais:

- Porta padrão: `587` com STARTTLS (`SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`).
- Alternativa: porta `465` com TLS implícito (`SMTP_SECURE=true`) se a rede bloquear `587`.
- O remetente (`EMAIL_FROM_ADDRESS`) deve pertencer a domínio/remetente validado na Brevo.
- SPF, DKIM e DMARC devem ser configurados no DNS do domínio antes de produção.

## Política de fallback e reprocessamento

- Envio de e-mail deve ocorrer em fluxo assíncrono quando aplicável.
- Falhas transitórias: retry com backoff exponencial.
- Exaustão de tentativas: encaminhar para DLQ com `correlationId`.
- Reprocessamento: somente via fluxo operacional registrado (runbook), com trilha auditável.

## Requisitos de domínio e autenticação de e-mail

- SPF configurado para os hosts remetentes autorizados.
- DKIM habilitado para assinatura de mensagens.
- DMARC ativo (mínimo monitoramento com política inicial `p=none`, evoluindo para enforcement conforme validação).

## Critérios de aceite de F1-08

- Decisão formal registrada (este documento).
- Variáveis de ambiente padronizadas no repositório (sem segredos reais).
- Pré-requisito técnico/documental para implementação de `F1-03` atendido.

## Referências

- Brevo SMTP Relay: `https://help.brevo.com/hc/en-us/articles/360001005870-SMTP-relay`
- Portas SMTP Brevo: `https://help.brevo.com/hc/en-us/articles/10905415650322-Which-SMTP-port-should-I-use-Port-587-465-or-2525`
- Documentação Brevo para SMTP transacional: `https://developers.brevo.com/docs/smtp-integration`
