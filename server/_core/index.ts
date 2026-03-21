import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerDiscordOAuthRoutes } from "../discord";
import { registerStripeWebhook } from "../stripeWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Register Stripe webhook BEFORE express.json() middleware
  registerStripeWebhook(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // ICS calendar endpoint for Apple Calendar (bi-weekly Sunday 5 PM ET)
  app.get("/api/calendar/circle-biweekly.ics", (_req, res) => {
    const ZOOM = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ALP Contractor Circle//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:The Contractor Circle \u2014 Bi-Weekly Call",
      "X-WR-TIMEZONE:America/New_York",
      "BEGIN:VEVENT",
      "DTSTART:20260329T210000Z",
      "DTEND:20260329T223000Z",
      "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU",
      "SUMMARY:The Contractor Circle \u2014 Bi-Weekly Call with Marshall",
      `DESCRIPTION:Bi-weekly Sunday group call with Marshall Wilkinson.\nJoin Zoom: ${ZOOM}`,
      `LOCATION:${ZOOM}`,
      `URL:${ZOOM}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename=\"contractor-circle.ics\"');
    res.send(ics);
  });

  // OAuth routes
  registerOAuthRoutes(app);
  registerDiscordOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`[Discord] OAuth configured for guild: ${process.env.DISCORD_GUILD_ID || "927273292354711613"}`);
    console.log(`[Stripe] Webhook endpoint: /api/stripe/webhook`);
  });
}

startServer().catch(console.error);
