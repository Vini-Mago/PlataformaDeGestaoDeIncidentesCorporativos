# F1-01 — E2E crítico de jornada principal

- Prioridade: `P0`
- Esforço: `L`
- Owner sugerido: Backend + Frontend + QA
- Dependências: nenhuma

## Objetivo

Garantir a jornada fim a fim: login, abertura de incidente, atribuição, mudança de status, conclusão e histórico visível.

## Escopo

- Cobrir autenticação via BFF/Identity.
- Cobrir endpoints de incidente principais.
- Validar atualização de estado no frontend.
- Validar histórico final da entidade.

## Tarefas técnicas

- Criar suíte E2E dedicada (novo arquivo em `packages/frontend` ou `scripts/` conforme estratégia atual).
- Subir dependências mínimas de teste (DB, Redis, RabbitMQ, serviços envolvidos).
- Implementar fixtures/dados de teste determinísticos.
- Validar asserts de API e UI para cada transição.
- Integrar execução no CI (job existente ou novo step).

## Critérios de aceite

- Teste E2E reproduzível e verde em ambiente local e CI.
- Falha controlada quando quebra de fluxo (teste realmente protege contrato).
- Evidência anexada: log de execução + caminho da suíte.

## Riscos

- Instabilidade por dependência de ambiente.
- Acoplamento excessivo entre teste e detalhes de UI.

## Evidências esperadas

- PR com suíte E2E.
- Execução CI verde.
