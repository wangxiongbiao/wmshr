import express from "express";
import path from "path";
import { Readable } from "node:stream";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PUBLIC_ADMIN_API_BASE_URL = process.env.ADMIN_API_BASE_URL
  || (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8788" : "https://admin.dutylix.com");
const DEFAULT_PUBLIC_ANDROID_RELEASE_VERSION = "0.1.29";
const DEFAULT_PUBLIC_ANDROID_RELEASE_CONTENT = "例行更新，修复已知问题并优化使用体验";
const DEFAULT_PUBLIC_ANDROID_RELEASE_URL =
  "https://github.com/wangxiongbiao/wmshr/releases/download/android-0.1.29/wmshr-android-0.1.29.apk";
const PUBLIC_ANDROID_RELEASE_VERSION = String(
  process.env.PUBLIC_ANDROID_RELEASE_VERSION || DEFAULT_PUBLIC_ANDROID_RELEASE_VERSION
).trim();
const PUBLIC_ANDROID_RELEASE_CONTENT = String(
  process.env.PUBLIC_ANDROID_RELEASE_CONTENT || DEFAULT_PUBLIC_ANDROID_RELEASE_CONTENT
).trim();
const PUBLIC_ANDROID_RELEASE_URL = String(process.env.PUBLIC_ANDROID_RELEASE_URL || DEFAULT_PUBLIC_ANDROID_RELEASE_URL).trim();

function getPortalAndroidReleaseFallback() {
  if (!PUBLIC_ANDROID_RELEASE_VERSION || !PUBLIC_ANDROID_RELEASE_URL) {
    return null;
  }

  return {
    version: PUBLIC_ANDROID_RELEASE_VERSION,
    content: PUBLIC_ANDROID_RELEASE_CONTENT || "例行更新，修复已知问题并优化使用体验",
    url: PUBLIC_ANDROID_RELEASE_URL,
  };
}

function sendPortalAndroidReleaseFallback(res: express.Response) {
  const fallback = getPortalAndroidReleaseFallback();
  if (!fallback) {
    return false;
  }

  res.json(fallback);
  return true;
}

function redirectToPortalAndroidReleaseFallback(res: express.Response) {
  const fallback = getPortalAndroidReleaseFallback();
  if (!fallback) {
    return false;
  }

  res.redirect(302, fallback.url);
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3001;

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Aether AI Server is running" });
  });

  // Example Gemini endpoint for a "magic" tagline on the landing page
  app.post("/api/generate-concept", async (req, res) => {
    try {
      const { topic } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a futuristic, poetic one-sentence description for: ${topic || 'Aether AI'}`,
      });
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/public/lead-requests", async (req, res) => {
    try {
      const response = await fetch(`${PUBLIC_ADMIN_API_BASE_URL}/api/public/lead-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body || {})
      });

      const payload = await response.text();
      const contentType = response.headers.get("content-type");

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      res.status(response.status).send(payload);
    } catch (error: any) {
      res.status(502).json({ error: error.message || "Unable to submit lead request" });
    }
  });

  app.get("/api/public/mobile-app-update", async (_req, res) => {
    try {
      // 门户前端只通过本站同源接口取最新包信息，避免把后台域名和跨域细节散落到 React 组件里。
      // 这里优先转发后台统一公开更新接口，保证门户下载按钮和移动端更新弹窗消费的是同一份版本数据。
      // Vercel Function 偶发无法从门户项目访问后台自定义域名时，允许回退到公开 GitHub Release 变量；
      // 这三个变量不是密钥，只作为“下载入口保底”，避免后台代理短暂异常时官网直接隐藏 Android 下载按钮。
      const response = await fetch(`${PUBLIC_ADMIN_API_BASE_URL}/api/public/mobile-app-update`);
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload || typeof payload !== "object") {
        if (sendPortalAndroidReleaseFallback(res)) {
          return;
        }

        return res.status(response.status).json(payload || { error: "Unable to load mobile app update" });
      }

      res.json(payload);
    } catch (error: any) {
      if (sendPortalAndroidReleaseFallback(res)) {
        return;
      }

      res.status(502).json({ error: error.message || "Unable to load mobile app update" });
    }
  });

  async function handleMobileAppDownload(req: express.Request, res: express.Response) {
    try {
      const requestHeaders: Record<string, string> = {};
      const range = String(req.headers.range || "").trim();
      const ifRange = String(req.headers["if-range"] || "").trim();

      if (range) {
        requestHeaders.Range = range;
      }
      if (ifRange) {
        requestHeaders["If-Range"] = ifRange;
      }

      const response = await fetch(`${PUBLIC_ADMIN_API_BASE_URL}/api/public/mobile-app-download`, {
        method: req.method,
        headers: requestHeaders,
      });

      if (!response.ok) {
        if (redirectToPortalAndroidReleaseFallback(res)) {
          return;
        }

        const payload = await response.text();
        return res.status(response.status).send(payload);
      }

      const contentType = response.headers.get("content-type");
      const contentDisposition = response.headers.get("content-disposition");
      const contentLength = response.headers.get("content-length");
      const contentRange = response.headers.get("content-range");
      const acceptRanges = response.headers.get("accept-ranges");
      const etag = response.headers.get("etag");
      const lastModified = response.headers.get("last-modified");

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      if (contentDisposition) {
        res.setHeader("Content-Disposition", contentDisposition);
      }
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }
      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      } else {
        res.setHeader("Accept-Ranges", "bytes");
      }
      if (etag) {
        res.setHeader("ETag", etag);
      }
      if (lastModified) {
        res.setHeader("Last-Modified", lastModified);
      }
      res.setHeader("Cache-Control", "no-store");

      res.status(response.status);

      if (req.method === "HEAD") {
        return res.end();
      }

      if (!response.body) {
        return res.status(502).json({ error: "Unable to download mobile app" });
      }

      Readable.fromWeb(response.body as any).pipe(res);
    } catch (error: any) {
      if (redirectToPortalAndroidReleaseFallback(res)) {
        return;
      }

      res.status(502).json({ error: error.message || "Unable to download mobile app" });
    }
  }

  app.head("/api/public/mobile-app-download", handleMobileAppDownload);
  app.get("/api/public/mobile-app-download", handleMobileAppDownload);

  app.get("/api/public/google-auth-url", async (req, res) => {
    try {
      const redirectTo = String(req.query.redirectTo || "");
      const response = await fetch(`${PUBLIC_ADMIN_API_BASE_URL}/api/public/google-auth-url?redirectTo=${encodeURIComponent(redirectTo)}`);
      const payload = await response.text();
      const contentType = response.headers.get("content-type");

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      res.status(response.status).send(payload);
    } catch (error: any) {
      res.status(502).json({ error: error.message || "Unable to create google auth url" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
