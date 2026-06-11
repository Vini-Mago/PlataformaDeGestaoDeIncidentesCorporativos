.PHONY: run frontend bff ngrok db-seed db-reset

run:
	pnpm dev

frontend:
	pnpm dev:frontend

bff:
	pnpm dev:bff

ngrok:
	@set -a; . ./.env; set +a; \
	ngrok config add-authtoken "$$NGROK_AUTHTOKEN" --config ./infra/ngrok.yml && \
	ngrok http 5173 --domain "$$NGROK_DOMAIN" --config ./infra/ngrok.yml

db-seed:
	pnpm db:seed

db-reset:
	pnpm db:reset
