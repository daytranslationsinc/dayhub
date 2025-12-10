import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

// setupVite is only called in development mode
// In production, this function should never be called
export async function setupVite(app: Express, server: Server) {
  // These imports only happen when this function is called (dev mode only)
  // They are excluded from the production bundle via esbuild --external
  const vite = await import("vite");
  const { nanoid } = await import("nanoid");

  // Load vite config dynamically
  const viteConfigModule = await import("../../vite.config");
  const viteConfig = viteConfigModule.default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const viteServer = await vite.createServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, serve built files from dist/public
  const distPath = path.resolve(process.cwd(), "dist", "public");

  console.log(`[Static] Serving files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] ERROR: Could not find build directory: ${distPath}`
    );
    console.error(`[Static] Current working directory: ${process.cwd()}`);
    console.error(`[Static] Directory contents:`, fs.readdirSync(process.cwd()));
  } else {
    console.log(`[Static] Build directory found, contents:`, fs.readdirSync(distPath));
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
