# F1-08 — Definição operacional de provedor de e-mail

- Prioridade: `P0`
- Esforço: `S`
- Owner sugerido: DevOps + Segurança
- Dependências: nenhuma

## Objetivo

Definir provedor de e-mail por ambiente com configuração segura e operacionalizável.

## Escopo

- Escolha do provedor (SMTP corporativo ou API dedicada).
- Variáveis de ambiente por ambiente.
- Requisitos de SPF/DKIM/DMARC quando aplicável.

## Tarefas técnicas

- Documentar decisão técnica e custos/limites.
- Definir variáveis e armazenamento de segredo (sem repositório).
- Definir estratégia de fallback/reenvio.
- Validar conectividade em homologação.

## Critérios de aceite

- Decisão formal registrada em `docs/`.
- Configuração homologável com credenciais fora do repositório.
- Pré-requisito de `F1-03` atendido.

## Riscos

- Dependência externa sem SLA claro.
- Bloqueio por política de domínio de e-mail.

## Evidências esperadas

- Documento de decisão + teste de envio em homologação.
