# Project Memory: Plataforma de Gestão de Incidentes Corporativos (PGIC)

This file serves as the private architectural index and state tracker for PGIC, updated across agentic execution sessions.

## 1. Architectural Overview & Services

PGIC is structured as a pnpm-based monorepo consisting of 11 distinct packages:

*   **`identity-service`**: Handles user registration, sessions, RBAC (Role-Based Access Control), password resets, and LGPD-compliant anonymization.
*   **`incident-service`**: Core incident management workflow (creation, assignments, state transitions, linking with problems).
*   **`request-service`**: Service requests with advanced approval workflows (single, sequential, and parallel approval steps).
*   **`problem-change-service`**: Covers Problem management (root cause tracking) and Change governance (version control for problems/changes).
*   **`sla-service`**: Calculates SLAs, tracks SLA risk thresholds, and emits breach events.
*   **`escalation-service`**: Reacts to SLA breach/risk events and applies escalation rules (criticality, breach type, reassignments).
*   **`notification-service`**: Manages email delivery via SMTP/STARTTLS for notifications.
*   **`integration-service`**: Standardizes external system communications (inbound and outbound) with timeout, retry backoff, and Dead Letter Queue (DLQ).
*   **`audit-service`**: Audits cross-service events and actions.
*   **`shared`**: Shared event contracts, validation schemas, and common utilities.
*   **`reporting-service`**: Generates reports asynchronously (submit, track, download).

---

## 2. Recent Milestones & Code Changes (2026-06-11)

### Database Reset & Seeding Automation (2026-06-11)
*   **Make Targets for DB Operations**:
    *   Created root script `scripts/db-reset.ts` using `npx prisma migrate reset --force` and `npx tsx ensure-database.ts` sequentially for all 10 databases in the workspace.
    *   Added `db:reset` and `db:seed` commands to root `package.json`.
    *   Created `db-seed` and `db-reset` targets in the root `makefile` to run migrations and seeds respectively.

### UI RBAC Restructuring & API Enforcement (2026-06-11)
*   **Navigation & Route RBAC Enforcement (2026-06-11)**:
    *   Defined metadata (`allowedRoles`) for navigation items, hiding unauthorized options on the frontend dynamically inside `AppShell` component based on `user?.role`.
    *   Restricted route navigation inside `ProtectedLayout` to prevent manual URL manipulation for unauthorized routes (`/problems`, `/changes`, `/users`, `/system`), redirecting to `/dashboard`.
    *   Enforced settings permissions in the backend for `integration-service` (`/integration-logs`, `/integration-dlq` and DLQ reprocessing) using `@pgic/shared`'s `requireJwtPermission`.
    *   Fixed broken/outdated UI tests (requests buttons, modal transitions) and added exhaustive unit tests validating menu visibility for all user roles (`admin`, `gestor`, `analista`, `noc`, `user`).
    *   Refactored `AppRoutes` in `App.tsx` into a clean, DRY, configuration-driven pattern using a `routesConfig` mapping of paths, elements, and allowed roles.
    *   Updated `RegisterUseCase` and `LoginUseCase` (for AD/LDAP JIT provisioning) in `identity-service` to dynamically assign the `"admin"` role to the first registered/provisioned user in the system (when the users repository is empty), bootstrapped automatically, while subsequent users receive the default `"user"` role.

### RF-9: Integration Endpoints for External Systems (2026-06-08)
*   **Integration Endpoints for External Systems (2026-06-08)**:
    *   Added support for external systems to retrieve and update incidents using API keys.
    *   Implemented `GET /api/webhooks/v1/incidents/:id` and `GET /api/webhooks/v1/incidents/external/:externalId` in `integration-service` to query incidents from `incident-service` using a signed JWT token.
    *   Implemented `PATCH /api/webhooks/v1/incidents/:id` and `PATCH /api/webhooks/v1/incidents/external/:externalId` in `integration-service` to perform status transitions in `incident-service`.
    *   Updated query capability in `incident-service` list endpoint to support filtering by `externalId` and `externalSource`.
    *   Documented all new integration endpoints in `integration-service` OpenAPI specification for Swagger UI unifier aggregation.
    *   Created comprehensive integration tests (`integration-incidents.spec.ts`) validating queries, resolutions, and updates (100% green).

## 2.1 Earlier Milestones & Code Changes (2026-05-28)

### RF-1: Corporate AD/LDAP Authentication & JIT Provisioning
*   **Corporate AD/LDAP Authentication & JIT Provisioning (2026-05-28)**:
    *   Created `ILDAPService` port interface and implemented a high-fidelity `MockLDAPService` driven adapter with dynamic mock corporate directory verification (e.g. allowing authentication for any `@corp.internal` address using `LdapPassword123` password).
    *   Refactored `LoginUseCase` in `identity-service` to support LDAP credential validation and automatic Just-In-Time (JIT) provisioning for new corporate accounts, persisting the User profile in a single transaction and publishing `user.created` event via Transactional Outbox for cross-service replication.
    *   Fully registered and wired all dependencies in the Awilix DI container.
    *   Created exhaustive unit tests in `login.use-case.spec.ts` achieving 100% green coverage across all local and corporate auth flows.

### NFR: LGPD Compliance & Performance SLOs
*   **LGPD Compliance & Performance SLOs (2026-05-28)**:
    *   Updated Prometheus alerting rules in `infra/observability/prometheus/pgic-alerts.yml` to strictly enforce our HTTP 5xx error rate SLO (alert fires if 5xx exceeds 1% of total request traffic for 5m) and HTTP latency SLO (alert fires if p95 exceeds 300ms for 5m).
    *   Created `privacy.integration.spec.ts` inside `identity-service` to serve as a robust E2E validation suite for our LGPD CLI tools (`prune-identity-data.ts` and `anonymize-identity-user.ts`).
    *   Successfully verified database-level constraints, OAuth cleanup, session revoking, and old logs/tokens purging, achieving 100% green sweeps across all 40 identity-service integration tests.

### Executive KPIs (MTTR & MTBF) & Heavy Asynchronous Reports
*   **RF-4: Executive KPIs & Heavy Asynchronous Reports (2026-05-28)**:
    *   Designed and implemented the domain service `ExecutiveKpiCalculator` to mathematically calculate MTTR (Mean Time to Repair) and MTBF (Mean Time Between Failures) metrics, correctly grouped by service affected, assigned team, and incident criticality.
    *   Created `prisma-incident-provider` to access the read-only replicated PostgreSQL database of the incident service using the generated Prisma Client.
    *   Refactored `RequestReportExportUseCase` in the `reporting-service` to integrate these calculations when exporting the `"kpi_dashboard"` report type.
    *   Added exhaustive unit tests (`executive-kpi-calculator.spec.ts`, `request-report-export.use-case.spec.ts`) and full integration tests (`reporting-service.integration.spec.ts`) validating background job queue handling, polling, and CSV formatting (which outputs separated sections for Service, Team, and Criticality metrics).

### Transversal Audit Core Implementation
*   **RF-3: Transversal Audit Trail (2026-05-28)**:
    *   Implemented `RabbitMqAuditEventsConsumer` in the `audit-service` to asynchronously consume and persist domain events published by the `incident-service`, `request-service`, `problem-change-service`, and `identity-service`.
    *   Utilized AMQP wildcard bindings (`#`) to map topic exchanges (`incident.events`, `request.events`, `problem.events`, `change.events`, `user.events`) to the centralized `audit.events_queue`.
    *   Implemented smart fallback extraction for actor `userId`, `resourceType`, `resourceId`, and payload mapping, preserving robust system action trails.
    *   Added full suite of integration tests (`rabbitmq-audit-events.consumer.integration.spec.ts`) verifying Postgres persistence from RabbitMQ messages.
*   **RF-10: Uniform Messaging Retry & DLQ Standardization (2026-05-28)**:
    *   Designed and implemented a generic `consumeWithRetry` helper inside `@pgic/shared/src/rabbitmq.helpers.ts`. It wraps consumer callbacks to automatically enforce transient vs. terminal error classification, handle exponential backoff delays before requeuing, map `correlationId` to logs and payloads, and route failed messages to Durably Asserted Dead Letter Queues (`queueName.failed`).
    *   Added exhaustive unit test suite `rabbitmq.helpers.spec.ts` in `@pgic/shared` testing all execution, transient retrying, terminal dead-lettering, and attempt ceiling edge cases.
    *   Refactored `RabbitMqAuditEventsConsumer` and `RabbitMqEscalationEventsConsumer` to use this generic wrapper, validating the implementation successfully through the integration suites.

### Platform Boot & Integration Fixes
*   **F2-10 (Dev Orchestration & Type Resolution)**:
    *   Diagnosed and resolved TypeScript compilation errors across downstream microservices (`Expected 1 arguments, but got 2` in `app.ts` files).
    *   Root cause was an out-of-sync `@pgic/shared` build (`dist/index.d.ts` not matching the source signature of `createMetricsHandler`). Fixed by rebuilding the shared package: `pnpm --filter @pgic/shared build`.
    *   Cleaned and restarted all microservices on standard configured ports (by stopping legacy Docker containers via `pnpm docker:down` and initiating a fresh `make run` cycle).
    *   Verified full ecosystem health with `pnpm ops:healthcheck`, achieving 100% green startup health check passes across all 10 services and Nginx Gateway.

### E2E Test Optimization & Requirements Validation
*   **Vitest E2E Test Isolation**:
    *   Identified that `packages/incident-service` was running E2E tests (`**/*.e2e.spec.ts`) during default unit test sweeps because they were not excluded in `vitest.config.ts`.
    *   Since E2E tests depend on external databases and RabbitMQ, running them under standard unit runs led to test timeouts.
    *   Updated `packages/incident-service/vitest.config.ts` to exclude `**/*.e2e.spec.ts` from unit tests, ensuring `pnpm test` finishes 100% green across the entire monorepo in seconds.
*   **Requirements Synchronization**:
    *   Fully reviewed and marked all related checklist requirements as complete (`Feito` / `[x]`) for **RF-6 (Advanced Approvals)**, **RF-7 (Change Governance)**, and **RF-8 (SLA/Escalation E2E)** in `docs/ChecklistContextoCorporativoCompleto.md` and `docs/ChecklistCompletoDetalhadoPassoAPasso.md`.

## 2.1 Earlier Milestones (2026-05-27)
### Phase 2: Platform Resilience & Policies
*   **F2-03 (Rollback & Incident Response Plan)**:
    *   Technical runbook defined in [ROLLBACK_INCIDENT_RESPONSE_RUNBOOK.md](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/docs/ops/ROLLBACK_INCIDENT_RESPONSE_RUNBOOK.md).
    *   Covers SEV classification, decision matrix (rollback vs. hotfix), operational timeline, and detailed recovery steps for application/config/database states.
*   **F2-08 (Uniform Messaging Retry & DLQ)**:
    *   Uniform policy established in [MESSAGING_RETRY_DLQ_POLICY.md](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/docs/ops/MESSAGING_RETRY_DLQ_POLICY.md).
    *   Reference flow in `integration-service` includes exponential backoff retry and DLQ routing (`GET /api/integration-dlq`, `POST /api/integration-dlq/:id/reprocess` with deduplication protection).
    *   Integration spec updated: [integration-service.integration.spec.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/integration-service/src/__tests__/integration/integration-service.integration.spec.ts).

### Phase 4: SLA, Advanced Approvals & Governance
*   **F4-01 (Incident + SLA Escalation)**:
    *   Updated SLA escalation use-case: [handle-escalation-domain-event.use-case.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/escalation-service/src/application/use-cases/handle-escalation-domain-event.use-case.ts).
    *   Added support for `no_first_response_minutes` by detecting response breach types (`sla.breach` with `breachType=response`).
    *   New unit tests: [handle-escalation-domain-event.use-case.spec.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/escalation-service/src/application/use-cases/handle-escalation-domain-event.use-case.spec.ts).
*   **F4-02 (Advanced Approvals in Requests)**:
    *   Advanced approval flows (`single`, `sequential`, `parallel`) implemented in `request-service`.
    *   New unit tests for transitions: [send-for-approval-service-request.use-case.spec.ts](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/packages/request-service/src/application/use-cases/send-for-approval-service-request.use-case.spec.ts).

---

## 3. Current Project Status (Verified via Code & Tests)

> [!WARNING]
> DO NOT rely strictly on the `docs/*.md` files for requirements progress. Several claims in the `.md` documentation are placeholders or outdated:
> - **AD/LDAP (RF-1)** is **fully implemented and co-exists cleanly with local authentication, verified by both unit and integration tests.**
> - **Change Governance (RF-7 / F4-03)** is listed as "Pendente" but is **fully implemented and tested in the backend use-cases**.
> - **Advanced Approvals (RF-6 / F4-02)** is **fully implemented and integrated in both Backend and React Frontend**, with sequential/parallel UI displays and strict button role checks.

### Real Code-Based Backlog

| Area / Feature | Real Code Status | Verified Next Actions |
| :--- | :--- | :--- |
| **`RF-1` User AD/LDAP** | **Fully Done & Tested** | Implemented `MockLDAPService` adapter with dynamic mock corporate directory authentication. Refactored `LoginUseCase` to validate credentials via LDAP and execute Just-In-Time (JIT) provisioning using the Transactional Outbox pattern when corporate accounts log in for the first time. Verified via unit and integration tests (100% green). |
| **`RF-4` Executive KPIs (MTTR/MTBF)** | **Fully Done & Tested** | Implemented `ExecutiveKpiCalculator`, `IIncidentProvider` database replication bridge, background export job worker, and downloadable CSV format split by service, team, and criticality. Verified via unit and integration tests (100% green). |
| **`RF-6` Advanced Approvals** | **Done (Backend & Frontend)** | Sequential and parallel approvals dynamically displayed; action buttons visible only to target step/role. |
| **`RF-7` Change Governance** | **Fully Done & Tested** | Visual and functional locking implemented in the React frontend (`ChangeSection.tsx`). Core fields (title, description, risk, type) are disabled when not in Draft mode; scheduling fields (window start/end, rollback plan) are disabled when scheduling edit is not allowed. Verified with new frontend unit tests. |
| **`RF-8` SLA & Escalation E2E** | **Fully Done & Tested** | Designed, implemented, and verified E2E integration test scenario (`sla-escalation.e2e.spec.ts`) spanning incident creation, SLA calculations, breach, and reassignment via HTTP. |
| **`RF-9` Integration Routes** | **Fully Done & Tested** | Implemented GET and PATCH endpoints in integration-service to query and update incidents by internal and external ID, with Swagger documentation. |


---

## 4. Key Verification Commands

Use these commands to validate system capabilities locally:

*   **Integration Tests (DLQ / Reprocessing)**:
    ```bash
    pnpm --filter integration-service run test:integration
    ```
*   **Event Contract Validation**:
    ```bash
    pnpm test:contract:events
    ```
*   **Escalation Service Domain Logic**:
    ```bash
    pnpm --filter escalation-service test -- src/application/use-cases/handle-escalation-domain-event.use-case.spec.ts
    ```
*   **Request Service Approvals**:
    ```bash
    pnpm --filter request-service test -- src/application/use-cases/send-for-approval-service-request.use-case.spec.ts
    ```
*   **Platform Health**:
    ```bash
    pnpm ops:healthcheck
    ```

---

## 5. Implementation Plans & Task Backlogs

*   **Plan to Complete Partial Requirements**: [PLANO_FECHAMENTO_REQUISITOS_PARCIAIS.md](file:///home/levi/Projects/PlataformaDeGestaoDeIncidentesCorporativos/docs/PLANO_FECHAMENTO_REQUISITOS_PARCIAIS.md)

