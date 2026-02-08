# Requires PowerShell 5+ and winget (Win10 21H1+ or Win11).
# One-liner: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = 'Stop'
Write-Host "🛠  Acme RAG CLI setup (Windows)" -ForegroundColor Cyan

# ---- Ensure winget ----
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "winget not found. Please install App Installer from Microsoft Store." -ForegroundColor Red
  exit 1
}

# ---- Install Node LTS if missing ----
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Installing Node.js LTS …' -ForegroundColor Yellow
  winget install -e --id OpenJS.NodeJS.LTS --silent
}

# ---- Refresh PATH for current session ----
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# ---- Install project deps ----
Write-Host 'Installing npm packages …' -ForegroundColor Yellow
npm install --silent

Write-Host 'Building TypeScript …' -ForegroundColor Yellow
npm run build --silent

Write-Host "`n✅  Setup complete. Run: node dist\\rag-cli.js" -ForegroundColor Green

