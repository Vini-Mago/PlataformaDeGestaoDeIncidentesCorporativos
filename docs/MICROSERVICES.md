# Microservices and Requirements Mapping

**Project name:** PGIC (Plataforma de Gestão de Incidentes Corporativos). Package scope: `@pgic/shared`; root package: `pgic`; Docker/env defaults: `pgic`.

**Database naming:** One Postgres instance, one database per service. Name pattern: `{service_name}_service` (snake_case), e.g. `identity_service`, `request_service`. New services: set `*_DATABASE_URL` in `.env.example`; the `prisma:migrate:deploy` script runs `scripts/ensure-database.ts` to create the DB if missing before migrations.

This document maps the **AnaliseRequisitos.md** (and **visãogeral.md**) to the current and planned microservices. It describes what was modified or removed to meet the requirements.

---

## 1. Decisions Summary

| Action | Service | Reason |
|--------|---------|--------|
| **Keep** | identity-service | Covers RF-1.x (Gestão de Usuários) and RF-2.x (Controle de Acesso). Auth, users, RBAC, JWT/OAuth2. |
| **Rename + extend** | catalog-service → **request-service** | visãogeral defines "Request Service: gestão do catálogo de serviços e requisições". RF-6.1 (catálogo) and RF-6.2 (fluxos de aprovação e atendimento) are implemented here. |
| **Planned** | incident-service, problem-change-service, sla-service, escalation-service, notification-service, audit-service, reporting-service, integration-service | To be added per visãogeral; not in scope of "modify or delete". |

No microservice was **deleted**; one was **renamed and repurposed** (catalog → request).

---

## 2. Current Microservices (After Changes)

### 2.1 identity-service

- **Responsibility:** Users, authentication, authorization (RBAC), sessions.
- **Requirements:** RF-1.1 to RF-1.7, RF-2.1 to RF-2.3.
- **Endpoints prefix (gateway):** `/identity/`
- **Status:** Kept as is; already aligned. Future work: ensure RBAC matrix (RF-2.2), password recovery (RF-1.6), session control (RF-1.7) if not yet implemented.

### 2.2 request-service (formerly catalog-service)

- **Responsibility:** Service catalog (catálogo de serviços padronizado) and service requests (requisições de serviço) with approval and fulfillment workflows.
- **Requirements:** RF-6.1 (catálogo), RF-6.2 (fluxos de aprovação e atendimento).
- **Endpoints prefix (gateway):** `/request/`
- **Status:** Renamed from catalog-service; domain extended with service catalog items and service requests per AnaliseRequisitos.

---

## 3. Requirements → Services Matrix (High Level)

| Module | Requirements | Service(s) |
|--------|---------------|-----------|
| Gestão de Usuários | RF-1.1–RF-1.7 | identity-service |
| Controle de Acesso | RF-2.1–RF-2.3 | identity-service |
| Auditoria | RF-3.1–RF-3.3 | audit-service (planned) |
| Dashboard e KPIs | RF-4.1–RF-4.5 | reporting-service (planned) |
| Incidentes | RF-5.1–RF-5.4 | incident-service (planned) |
| Requisições de Serviço | RF-6.1–RF-6.2 | **request-service** |
| Problemas e Mudanças | RF-7.1–RF-7.3 | problem-change-service (planned) |
| SLA e Escalonamento | RF-8.1–RF-8.4 | sla-service, escalation-service (planned) |
| Integrações | RF-9.1–RF-9.3 | integration-service (planned) |
| Processamento assíncrono | RF-10.1–RF-10.2 | shared (RabbitMQ, workers in each service) |

---

## 4. References

- **docs/AnaliseRequisitos.md** – Detailed functional requirements.
- **docs/visãogeral.md** – High-level architecture and list of suggested microservices.
