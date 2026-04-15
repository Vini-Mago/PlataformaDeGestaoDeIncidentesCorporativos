param(
  [Parameter(Position = 0)]
  [string]$Target = "help"
)

$ErrorActionPreference = "Stop"

function Show-Help {
  Write-Host "Uso: ./make.ps1 <alvo>"
  Write-Host ""
  Write-Host "Alvos disponíveis:"
  Write-Host "  run       npm run docker:up && npm run dev"
  Write-Host "  frontend  npm run dev:frontend"
  Write-Host "  bff       npm run dev:bff"
  Write-Host "  ngrok     carrega .env e inicia ngrok"
  Write-Host "  help      mostra esta ajuda"
}

function Load-DotEnv([string]$Path) {
  if (-not (Test-Path -Path $Path)) {
    throw "Arquivo .env não encontrado em: $Path"
  }

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")

    if ($key) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
}

switch ($Target.ToLowerInvariant()) {
  "run" {
    npm run docker:up
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run dev
    exit $LASTEXITCODE
  }
  "frontend" {
    npm run dev:frontend
    exit $LASTEXITCODE
  }
  "bff" {
    npm run dev:bff
    exit $LASTEXITCODE
  }
  "ngrok" {
    Load-DotEnv (Join-Path $PSScriptRoot ".env")

    if (-not $env:NGROK_AUTHTOKEN) {
      throw "NGROK_AUTHTOKEN não definido no .env"
    }

    if (-not $env:NGROK_DOMAIN) {
      throw "NGROK_DOMAIN não definido no .env"
    }

    ngrok config add-authtoken $env:NGROK_AUTHTOKEN --config ./infra/ngrok.yml
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    ngrok http 5173 --domain $env:NGROK_DOMAIN --config ./infra/ngrok.yml
    exit $LASTEXITCODE
  }
  "help" {
    Show-Help
    exit 0
  }
  default {
    Write-Error "Alvo inválido: '$Target'"
    Show-Help
    exit 1
  }
}
