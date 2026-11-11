#!/bin/sh
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Please install Node.js from https://nodejs.org first."; exit 1; }
[ -d node_modules ] || npm install
( sleep 8; open http://localhost:3030 2>/dev/null || xdg-open http://localhost:3030 2>/dev/null ) &
node server.js
