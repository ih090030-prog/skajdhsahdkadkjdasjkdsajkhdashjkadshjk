# ESOK + Scramjet

Everything is in this folder: the ESOK site (`public/`), ESOK AI (`/api/chat`),
and the Scramjet proxy + Wisp socket. Searching in ESOK opens the result through Scramjet.

## Run on your computer
Install Node.js (https://nodejs.org), then double-click `start.bat` (Windows) or run `./start.sh` (Mac/Linux).
The first start downloads the Scramjet runtime, so it needs internet and takes a few seconds.
It opens http://localhost:3030.

## Put it online (Render, Railway, Fly.io)
Upload this folder to GitHub and deploy it as a Node web service (`render.yaml` included).
It must be a host that supports WebSockets. Netlify cannot run the proxy.

## ESOK AI (optional)
Set the `OPENAI_API_KEY` environment variable (optional: `OPENAI_BASE_URL`, `AI_MODEL`). Search works without it.
