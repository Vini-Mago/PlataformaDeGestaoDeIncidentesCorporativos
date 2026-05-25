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
