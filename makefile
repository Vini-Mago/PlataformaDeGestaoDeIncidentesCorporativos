.PHONY: run frontend bff ngrok

run:
	npm run docker:up && npm run dev

frontend:
	npm run dev:frontend

bff:
	npm run dev:bff

ngrok:
	@set -a; . ./.env; set +a; \
	ngrok config add-authtoken "$$NGROK_AUTHTOKEN" --config ./infra/ngrok.yml && \
	ngrok http 5173 --domain "$$NGROK_DOMAIN" --config ./infra/ngrok.yml
