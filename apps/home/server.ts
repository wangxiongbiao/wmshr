import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PUBLIC_ADMIN_API_BASE_URL = process.env.ADMIN_API_BASE_URL
  || (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8788" : "https://admin.dutylix.com");

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
