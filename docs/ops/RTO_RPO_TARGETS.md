# PGIC — Metas RTO/RPO e Evidência

Data: 2026-05-25

## Definições

- **RTO (Recovery Time Objective):** tempo máximo aceitável para restaurar operação.
- **RPO (Recovery Point Objective):** janela máxima aceitável de perda de dados.

## Metas iniciais (MVP)

- PostgreSQL:
  - RTO alvo: <= 60 minutos
  - RPO alvo: <= 24 horas (backup diário)
- RabbitMQ:
  - RTO alvo: <= 30 minutos
  - RPO alvo: <= 15 minutos para filas duráveis (depende de configuração e persistência)
- Redis:
  - RTO alvo: <= 30 minutos
  - RPO alvo: best-effort (cache reconstruível)

## Evidência atual no repositório

- Backup automatizado e retenção:
  - `pnpm db:backup`
  - `pnpm db:backup:run`
  - `pnpm db:backup:check`
- Teste de restore:
  - `pnpm db:restore:test`
- Healthcheck operacional:
  - `pnpm ops:healthcheck`
- Job consolidado:
  - `pnpm ops:maintenance`

## Próxima medição obrigatória

Para fechar o ciclo RC §3.4/§10:

1. Executar restore test e medir tempo total.
2. Simular indisponibilidade controlada de broker e medir recuperação.
3. Registrar resultados reais e comparar com metas deste documento.

## Registro de medição (template)

- Data/hora:
- Cenário:
- RTO medido:
- RPO medido:
- Meta atendida? (sim/não)
- Ações corretivas:
