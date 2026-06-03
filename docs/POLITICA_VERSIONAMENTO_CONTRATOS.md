# PGIC — Política de Versionamento de Contratos de Eventos

**Data:** 2026-05-31
**Status:** Oficial

## 1. Objetivo
Esta política formaliza o padrão de evolução e manutenção da compatibilidade dos schemas de eventos (RabbitMQ) e APIs (REST) entre os microserviços da PGIC, garantindo interoperabilidade segura e evitando quebras em produção.

## 2. Princípios de Versionamento (RabbitMQ e Eventos Assíncronos)

1. **Retrocompatibilidade Obrigatória (Backward Compatibility):**
   * Nenhum campo obrigatório existente pode ser removido ou alterado em seu tipo.
   * Novos campos adicionados ao payload de um evento **devem ser opcionais** (`z.optional()`).
   * A validação do schema via Zod (`passthrough()`) deve ignorar campos desconhecidos para que consumidores antigos continuem funcionando se um *publisher* enviar dados adicionais.

2. **Quebra de Contrato (Breaking Changes):**
   * Se uma mudança quebrar a retrocompatibilidade (ex: mudança de tipo, remoção de campo crítico), o nome do evento lógico não deve ser reutilizado, ou deve ser versionado explicitamente.
   * **Exemplo:** Se `request.submitted` sofrer uma alteração estrutural profunda, ele deve ser migrado para `request.submitted.v2`.
   * Durante a transição, o *publisher* precisará emitir o evento nas duas versões até que todos os consumidores atualizem sua lógica.

3. **Governança:**
   * Todos os schemas de eventos residem centralmente no pacote `@pgic/shared` (pasta `src/events/`).
   * A alteração de um contrato existente deve acionar a pipeline automática (`pnpm test:contract:events`), que falhará caso um payload previamente válido deixe de sê-lo.

## 3. Cobertura Atual
A suíte de testes de contratos automatizados (`scripts/contracts/verify-event-contracts.ts`) cobre:
* Incidentes (`incident.created`, `incident.status_changed`, `incident.assigned`)
* Requisições (`request.*`)
* Problemas e Mudanças (`problem.created`, `change.created`, links)
* SLA (`sla.risk`, `sla.breach`)
* Integrações Externas (`integration.incident_ingest`, `integration.outbound_dispatch`)
* Notificações (`notification.email_sent`)
* Relatórios (`reporting.exported`)
* Usuários (`user.created`, `user.updated`)
