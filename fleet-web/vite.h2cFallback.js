import { ServerResponse } from "http";

/**
 * Cursor's Simple Browser / port preview often sends HTTP/2 cleartext
 * (`Upgrade: h2c`). Vite's HTTP server treats any Upgrade as WebSocket HMR,
 * never writes an HTTP response, and the browser shows ERR_EMPTY_RESPONSE.
 * Decline non-WebSocket upgrades and run them through Vite as HTTP/1.1.
 */
export function h2cFallback() {
  return {
    name: "h2c-fallback",
    configureServer(server) {
      const patch = () => {
        const httpServer = server.httpServer;
        if (!httpServer || httpServer.__h2cPatched) return;
        httpServer.__h2cPatched = true;

        const existing = httpServer.listeners("upgrade").slice();
        httpServer.removeAllListeners("upgrade");
        httpServer.on("upgrade", (req, socket, head) => {
          const upgrade = String(req.headers.upgrade || "").toLowerCase();
          if (upgrade === "websocket") {
            for (const fn of existing) fn.call(httpServer, req, socket, head);
            return;
          }

          if (head?.length) socket.unshift(head);
          delete req.headers.upgrade;
          delete req.headers["http2-settings"];
          req.headers.connection = "close";

          const res = new ServerResponse(req);
          res.shouldKeepAlive = false;
          res.assignSocket(socket);
          server.middlewares(req, res, () => {
            if (!res.writableEnded) {
              res.statusCode = 404;
              res.end();
            }
          });
        });
      };

      const later = () => setImmediate(patch);
      if (server.httpServer?.listening) later();
      else server.httpServer?.once("listening", later);
      setTimeout(patch, 300);
    },
  };
}
