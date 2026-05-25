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
