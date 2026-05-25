# PGIC — Política de Versionamento de API

Data: 2026-05-25

## Regra padrão

1. Endpoints públicos novos devem nascer versionados por caminho (`/v1/...`).
2. Quebra de contrato exige nova versão (`/v2/...`) com período de convivência.
3. Endpoints legados sem `/v1` devem receber alias versionado de forma incremental, sem quebra imediata.

## Convenções

- Formato preferencial: `/{servico}/api/.../v1/...` ou `/api/.../v1/...`.
- OpenAPI deve indicar versão no `info.version` e no `path` versionado.
- Mudanças breaking devem ser registradas em changelog técnico de release.

## Situação atual (repositório)

- Integrações já expostas com versão explícita em path:
  - `/api/webhooks/v1/monitoring`
  - `/api/outbound/v1/deliver`
- Demais serviços possuem contratos OpenAPI e evolução incremental; migração para cobertura integral `/v1` segue roadmap sem ruptura.

## Fluxo para mudança breaking

1. Criar novo endpoint/versionamento (`/v2`).
2. Manter endpoint antigo por janela de convivência.
3. Publicar aviso de depreciação no changelog de release.
4. Remover versão antiga somente após janela acordada.
