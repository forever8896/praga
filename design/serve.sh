#!/usr/bin/env bash
# Serve the Praga design canvas locally.
# Babel-standalone fetches *.jsx via XHR, so file:// won't work — we need HTTP.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8765}"
echo "Praga design canvas → http://127.0.0.1:${PORT}/"
exec python3 -m http.server "${PORT}"
