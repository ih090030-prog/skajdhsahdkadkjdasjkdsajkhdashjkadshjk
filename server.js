import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";
import http from "node:http";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

const PORT = process.env.PORT || 3030;

// Downloads the prebuilt Scramjet runtime from npm at startup, then gives us
// the route handlers for /sw.js, /bootstrap-init.js, /scram/*, /controller/*,
// /clients/* and the /wisp/ WebSocket endpoint.
let routeRequest = () => false;
let routeUpgrade = () => false;
try {
  ({ routeRequest, routeUpgrade } = await bootstrap());
  console.log("Scramjet runtime ready");
} catch (err) {
  // Keep the site and AI chat up even if the runtime download failed.
  console.error("Scramjet bootstrap FAILED (proxy will not work):", err);
}

const app = express();
app.disable("x-powered-by");

// 1) Scramjet runtime routes
app.use((req, res, next) => {
  if (routeRequest(req, res)) return;
  next();
});

// 2) ESOK AI chat (same behaviour as the old Netlify function)
app.post("/api/chat", express.json({ limit: "64kb" }), async (req, res) => {
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return res.status(400).json({ error: "Send between 1 and 40 chat messages." });
  }
  const clean = [];
  for (const m of messages) {
    if (!m || !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" || !m.content.trim() || m.content.length > 4000) {
      return res.status(400).json({ error: "A chat message is invalid or too long." });
    }
    clean.push({ role: m.role, content: m.content.trim() });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
  if (!apiKey) {
    return res.status(503).json({
      error: "ESOK AI is not configured yet. Set the OPENAI_API_KEY environment variable on the server."
    });
  }

  try {
    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are ESOK AI, a helpful, friendly assistant. Explain school subjects clearly, show math steps when useful, handle typos gracefully, and be honest when unsure. Keep answers appropriate for a general audience."
          },
          ...clean
        ],
        max_tokens: 900
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI error:", upstream.status, result?.error?.message || "unknown");
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: upstream.status === 429
          ? "ESOK AI is busy right now. Please wait a moment and try again."
          : "The online AI service returned an error. Check the API key and model name."
      });
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({ error: "The AI service returned an empty response." });
    }
    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error("ESOK chat failed:", err);
    res.status(502).json({ error: "Could not reach the online AI service. Please try again." });
  }
});

// 3) Static site (ESOK front end + /scramjet-client/)
app.get("/healthz", (_req, res) => res.send("ok"));
app.use(express.static(publicDir));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  if (!routeUpgrade(req, socket, head)) socket.destroy();
});

server.listen(PORT, "0.0.0.0", () => console.log(`ESOK running on port ${PORT}`));
