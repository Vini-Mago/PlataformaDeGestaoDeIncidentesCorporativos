# problem-change-service

Problem and Change Management (RF-7.x): recurring problems (root cause, action plan) and planned changes (window, risk, rollback, approval workflow).

## Setup

1. Configure `PROBLEM_CHANGE_DATABASE_URL` and `PROBLEM_CHANGE_SERVICE_PORT` in root `.env`.
2. Run migrations: `pnpm --filter problem-change-service run prisma:migrate:deploy`
3. Start: `pnpm run dev:problem-change`

## Gateway

- Prefix: `/problem-change/`
- Health: `http://localhost:${GATEWAY_PORT}/problem-change/health` (`GATEWAY_PORT` no `.env`; service listens on `PROBLEM_CHANGE_SERVICE_PORT`, default in `.env.example`: 3205)
