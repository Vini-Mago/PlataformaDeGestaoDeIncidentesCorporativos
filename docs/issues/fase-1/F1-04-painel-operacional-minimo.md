# F1-04 — Painel operacional mínimo

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: Reporting + Frontend
- Dependências: `F1-01`

## Objetivo

Entregar visão operacional mínima: abertos, em risco de SLA e concluídos por período com filtros básicos.

## Escopo

- Endpoints de agregação no `reporting-service` (ou serviço de domínio responsável).
- UI com filtros de período/criticidade/equipe (mínimo viável).
- Consistência numérica com backend.

## Tarefas técnicas

- Definir contratos dos widgets e filtros.
- Implementar consultas agregadas com paginação/limites seguros.
- Exibir estado de carregamento/erro e última atualização.
- Cobrir com testes de integração e teste de componente.

## Critérios de aceite

- Dashboard renderiza 3 indicadores mínimos com filtros funcionais.
- Números conferem com consulta backend para mesmo filtro.
- Sem regressão nas rotas existentes.

## Riscos

- Consultas pesadas sem cache/índice.
- Divergência entre regra de negócio e agregação.

## Evidências esperadas

- Prints/GIF da tela.
- Testes verdes e contrato documentado.

## Evidência atual (2026-05-27)

- Dashboard operacional mínimo implementado no frontend (`/dashboard`) com:
  - 3 KPIs principais: `Incidentes abertos`, `Em risco de SLA`, `Concluídos no período`.
  - filtros funcionais: `Período` (24h/7d/30d), `Criticidade`, `Equipe`.
  - estado de atualização e `Última atualização`.
- Dados derivados do backend de incidentes (`/incidents/incidents`) com consistência de filtro aplicada na camada de apresentação.
- Correção de regra:
  - `Incidentes abertos` e `Em risco de SLA` não excluem incidentes antigos apenas pelo filtro de período.
  - `Concluídos no período` usa `resolvedAt`/`closedAt` quando disponível, com fallback legado para `createdAt`.
- Regressão validada:
  - `pnpm --filter frontend test` (verde)
  - `pnpm --filter frontend build` (verde)
