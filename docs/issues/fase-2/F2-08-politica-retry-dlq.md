# F2-08 — Política uniforme de retry/DLQ/reprocessamento

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: Integration + Platform
- Dependências: `F2-02`

## Objetivo

Uniformizar comportamento assíncrono entre integrações para reduzir perda de mensagem e retrabalho operacional.

## Escopo

- Regras comuns de retry e backoff.
- Critérios de envio para DLQ.
- Processo de reprocessamento seguro.
- Rastreabilidade por correlation id ponta a ponta.

## Tarefas técnicas

- Definir política padrão versionada para serviços assíncronos.
- Mapear exceções justificadas por integração.
- Implementar/verificar instrumentação de correlation id.
- Criar testes de falha, retry, DLQ e reprocessamento.
- Publicar runbook específico de incidentes de mensageria.

## Critérios de aceite

- Política aprovada e aplicada nos fluxos críticos.
- Testes automatizados cobrindo cenários de falha/reprocessamento.
- Runbook com passos claros para operação.

## Evidências esperadas

- PR de implementação e documentação.
- Execução dos testes automatizados.
- Exemplo de trilha completa via correlation id.

