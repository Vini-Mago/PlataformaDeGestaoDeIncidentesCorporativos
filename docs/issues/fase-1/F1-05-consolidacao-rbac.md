# F1-05 — Consolidação de permissões nos fluxos principais

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: Identity + Times de domínio
- Dependências: nenhuma

## Objetivo

Consolidar enforcement de RBAC nos fluxos críticos de incidentes, requisições, problemas e mudanças.

## Escopo

- Middleware/guards nos serviços de domínio.
- Permissões `read/create/update/approve` por módulo e escopo.
- Compatibilidade com tokens atuais (`perms`) e papel admin.

## Tarefas técnicas

- Inventariar endpoints críticos e permissão esperada.
- Aplicar/verificar `requireJwtPermission`/equivalente.
- Garantir comportamento padronizado de `401/403`.
- Criar matriz papel x ação x endpoint em documento versionado.

## Critérios de aceite

- Endpoints críticos protegidos com permissão correta.
- Testes de autorização cobrindo negação e sucesso.
- Matriz RBAC publicada em `docs/`.

## Riscos

- Diferença entre regra esperada por produto e implementação técnica.
- Quebra de clients por mudança de autorização sem comunicação.

## Evidências esperadas

- PR com testes 401/403.
- Documento de matriz de permissões.

## Evidência atual (2026-05-27)

- `problem-change-service`: rotas de leitura migradas para aceitar `read:all` **ou** `read:own` (`requireAnyJwtPermission`), alinhando com lógica de ownership do controller.
- `problem-change-service`: endpoints de versões agora validam ownership antes de retornar histórico:
  - `GET /api/problems/:id/versions`
  - `GET /api/changes/:id/versions`
- `problem-change-service`: endpoint agregado `GET /api/problems/linked-for-incidents` exige `problems:read:all`, evitando vazamento para usuários apenas `read:own`.
- Testes de integração adicionados para `read:own`:
  - `GET /api/problems/:id` retorna `403` quando não owner e `200` quando owner.
  - `GET /api/changes/:id` retorna `403` quando não owner e `200` quando owner.
- Testes de integração adicionados para versões e endpoint agregado.
- Matriz RBAC publicada: `docs/RBAC_MATRIZ_FLUXOS_PRINCIPAIS.md`.
- Validação local:
  - `pnpm --filter problem-change-service test` verde (`66/66`).
  - `pnpm --filter problem-change-service exec tsc --noEmit` verde.
  - `pnpm --filter problem-change-service test:integration` verde (`42/42`, fora do sandbox com `.env`).
