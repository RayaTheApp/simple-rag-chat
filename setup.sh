#!/usr/bin/env bash
# One-shot bootstrap for macOS / Linux.
# Installs Node (via Volta), project deps, and builds TypeScript.

set -euo pipefail

echo "🛠  Acme RAG CLI setup (macOS/Linux)"

# ---- Ensure Homebrew (macOS) or skip on Linux ----
if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "🔧 Installing Homebrew …"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$($(brew --prefix)/bin/brew shellenv)"
  fi
fi

# ---- Install Volta (portable Node version manager) ----
if ! command -v volta >/dev/null 2>&1; then
  echo "🔧 Installing Volta (manages Node) …"
  curl https://get.volta.sh | bash -s -- --skip-setup
  export VOLTA_HOME="${HOME}/.volta"
  export PATH="${VOLTA_HOME}/bin:${PATH}"
fi

# ---- Install Node LTS ----
volta install node@18 >/dev/null

# ---- Project dependencies ----
echo "📦 Installing npm packages …"
npm install --silent

echo "🔨 Building TypeScript …"
npm run build --silent

echo -e "\n✅  Setup complete. Run: npx rag\n"

