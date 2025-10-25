import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "client", "dist");
  const uploadsPath = path.resolve(import.meta.dirname, "uploads");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Serve static files from the dist directory
  app.use(express.static(distPath));

  // Serve uploaded files with proper content types
  app.use("/uploads", express.static(uploadsPath, {
    setHeaders: (res, path) => {
      // Set appropriate content type based on file extension
      const ext = path.split('.').pop()?.toLowerCase();
      if (ext) {
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'txt': 'text/plain',
          'mp4': 'video/mp4',
          'mpeg': 'video/mpeg',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
          'webm': 'video/webm',
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg'
        };
        const contentType = mimeTypes[ext];
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }
      }
    }
  }));

  // Only serve index.html for non-API routes
  app.use("*", (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
