import http from "node:http";
import type { StatusStore } from "./store.js";
import { logger } from "../utils/logger.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function startStatusServer(
  store: StatusStore,
  port: number,
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { ...CORS_HEADERS, "Content-Type": "text/plain" });
      res.end("Method Not Allowed");
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    switch (url.pathname) {
      case "/health": {
        const snapshot = store.snapshot();
        const statusCode = snapshot.status === "ok" ? 200 : 503;
        res.writeHead(statusCode, {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ status: snapshot.status }));
        break;
      }

      case "/status": {
        const snapshot = store.snapshot();
        res.writeHead(200, {
          ...CORS_HEADERS,
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify(snapshot));
        break;
      }

      default:
        res.writeHead(404, { ...CORS_HEADERS, "Content-Type": "text/plain" });
        res.end("Not Found");
    }
  });

  server.on("error", (err) => {
    logger.error("STATUS", "Status server error", { error: err });
  });

  server.listen(port, () => {
    logger.info("STATUS", `Status server listening on port ${port}`);
  });

  return server;
}
