# PGIC — Failover Runbook (PostgreSQL, RabbitMQ, Redis)

Data: 2026-05-25

## Objetivo

Definir procedimento operacional padrão para incidentes de indisponibilidade de infraestrutura crítica.

## Escopo

- PostgreSQL (container `pgic-postgres` no ambiente local; equivalente gerenciado em produção)
- RabbitMQ (container `pgic-rabbitmq`)
- Redis (container `pgic-redis`)

## Critérios de acionamento

Acionar este runbook quando ocorrer qualquer condição:

1. `pnpm ops:healthcheck` retorna falha para infraestrutura.
2. Gateway retorna `5xx` por indisponibilidade de dependência.
3. Fila RabbitMQ ultrapassa threshold por período contínuo.
4. Time de operação confirma perda de conectividade com banco/cache/broker.

## Procedimento — PostgreSQL

1. Verificar estado:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | rg pgic-postgres
```

2. Se parado, subir infra:

```bash
pnpm docker:up
```

3. Validar readiness:

```bash
docker exec pgic-postgres sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' pg_isready -U '${POSTGRES_USER:-pgic}'"
```

4. Se dados inconsistentes/corrompidos: restaurar última cópia válida:

```bash
pnpm db:restore -- --db identity_service
# repetir para demais bases afetadas
```

## Procedimento — RabbitMQ

1. Verificar container e filas:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | rg pgic-rabbitmq
docker exec pgic-rabbitmq sh -lc "rabbitmqctl list_queues name messages -q"
```

2. Se parado, subir infra:

```bash
pnpm docker:up
```

3. Se backlog excessivo persistente:

- validar consumidores (serviços de domínio);
- reiniciar serviço consumidor degradado;
- reprocessar DLQ via endpoints existentes (ex.: integração);
- registrar incidente e janela.

## Procedimento — Redis

1. Verificar estado:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | rg pgic-redis
```

2. Se parado, subir infra:

```bash
pnpm docker:up
```

3. Validar ping:

```bash
docker exec pgic-redis redis-cli ping
```

## Validação pós-recuperação

Executar:

```bash
pnpm ops:healthcheck
```

Critério de sucesso:

- todos os serviços com `HTTP 200`;
- infra e filas dentro de threshold.

## Registro obrigatório do incidente

- timestamp início/fim
- sintoma observado
- componente afetado
- ação executada
- tempo total de recuperação
- evidência de comando/log

## Limitações conhecidas

- Ambiente atual usa infraestrutura local Compose (sem replicação automática).
- Para produção, recomenda-se serviço gerenciado/cluster e procedimento de promoção de réplica alinhado ao provedor.
