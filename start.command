#!/bin/zsh
cd "${0:A:h}" || exit 1
NODE="$(command -v node 2>/dev/null)"
if [[ -z "$NODE" ]]; then
  NODE="/nix/store/3jzjqgw7kq5lnfx8kzw1p8byi3sb17q0-nodejs-22.23.2/bin/node"
fi
if [[ ! -x "$NODE" ]]; then
  echo "Node.js not found. Install Node.js 22 or newer from https://nodejs.org/ then run this again."
  exit 1
fi
if [[ ! -d node_modules ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "Dependencies are missing. Install Node.js with npm, then run: npm ci"
    exit 1
  fi
  echo "Installing project dependencies (first launch only)..."
  npm ci || exit 1
fi
"$NODE" build-data.cjs || exit 1
"$NODE" node_modules/vite/bin/vite.js --config vite.config.mjs --host 127.0.0.1 --port 4173 --strictPort
