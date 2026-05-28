# F2-05 — Gestão de segredos e TLS

- Prioridade: `P0`
- Esforço: `M`
- Owner sugerido: Segurança + DevOps
- Dependências: nenhuma

## Objetivo

Eliminar segredos expostos e garantir transporte seguro em ambientes não locais.

## Escopo

- Zero segredo sensível em repositório/imagem.
- Gestão de segredos por ambiente com rotação.
- TLS válido para endpoints externos.
- Auditoria periódica de vazamento.

## Tarefas técnicas

- Mapear segredos usados por serviço e ambiente.
- Definir padrão de injeção de segredo em runtime.
- Configurar rotação e checklist de expiração.
- Validar certificados e cadeia TLS.
- Criar verificação automática de segredo em CI.

## Critérios de aceite

- Nenhum segredo crítico no código versionado.
- TLS ativo e validado em homologação.
- Processo de rotação documentado e testado.

## Evidências esperadas

- PR de configuração operacional.
- Resultado de varredura de segredos.
- Registro de validação TLS.

