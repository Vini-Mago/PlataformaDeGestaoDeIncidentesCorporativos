# F1-06 — Padronização de warnings de lint

- Prioridade: `P1`
- Esforço: `S`
- Owner sugerido: Backend
- Dependências: nenhuma

## Objetivo

Reduzir warnings evitáveis de lint e padronizar exceções explícitas.

## Escopo

- Arquivos com `any` evitável em testes e camadas críticas.
- Exceções justificadas quando tradeoff for aceito.

## Tarefas técnicas

- Corrigir warnings atuais identificados no request-service tests.
- Trocar `any` por tipos locais mínimos (`unknown`, interfaces de teste, factories tipadas).
- Onde necessário, usar disable pontual com justificativa curta.

## Critérios de aceite

- `pnpm lint` sem warnings considerados bloqueantes pela equipe.
- Nenhuma perda de legibilidade dos testes.

## Riscos

- Overengineering de tipagem em teste simples.

## Evidências esperadas

- Saída de lint no PR.

## Evidência atual (2026-05-26)

- `pnpm lint` executado com sucesso e sem warnings/erros.
- Warnings de `any` removidos nos arquivos:
  - `packages/problem-change-service/src/adapters/driven/persistence/prisma-problem.repository.spec.ts`
  - `packages/request-service/src/adapters/driving/http/service-request.controller.spec.ts`
