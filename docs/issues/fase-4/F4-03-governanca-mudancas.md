# F4-03 — Governança de mudanças (RF-7)

- Prioridade: `P1`
- Esforço: `M`
- Owner sugerido: Problem-Change + Frontend
- Dependências: `F1-05`

## Objetivo

Endurecer o controle de mudanças com regras operacionais claras e enforcement técnico.

## Escopo

- Política de edição por status.
- Validação de janela de execução.
- Restrições por perfil e trilha de alteração.
- Consistência entre API, domínio e UI.

## Tarefas técnicas

- Revisar políticas de transição e edição no domínio de mudanças.
- Garantir validações de janela com mensagens de erro consistentes.
- Aplicar RBAC por ação crítica de mudança.
- Atualizar frontend para bloquear/permitir ações com base no estado.
- Cobrir fluxos com testes unitários/integrados.

## Critérios de aceite

- Alterações indevidas bloqueadas por estado/papel.
- Janela de execução validada de forma determinística.
- Histórico de alteração disponível para auditoria.

## Evidências esperadas

- PR com regras e testes.
- Logs de validação de transições críticas.
- Atualização de documentação de fluxo de mudança.

