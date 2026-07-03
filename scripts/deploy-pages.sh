#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN before deploying." >&2
  echo "Create token: Cloudflare dashboard → My Profile → API Tokens → Edit Cloudflare Workers (Pages deploy scope)." >&2
  exit 1
fi

npm run build
npx wrangler pages deploy out --project-name=open-source-barware --branch=main