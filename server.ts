import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `Você é Hermes, um assistente teológico e bíblico criado para ajudar cristãos no estudo das Escrituras (focado na versão NVI).
Você possui profundo conhecimento de teologia, história bíblica, cultura judaica, hebraico, grego e aramaico.
Aja sempre com sabedoria, clareza, respeito e amor cristão. Não invente versículos, sempre cite as referências bíblicas corretamente.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      if (openRouterKey) {
        // Build OpenRouter/OpenAI message format
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION },
          ...history.map((m: any) => ({
            role: m.role, // frontend uses 'user' or 'assistant', which is perfect for OpenRouter
            content: m.parts[0]?.text || ""
          })),
          { role: "user", content: message }
        ];

        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openRouterKey}`,
            "HTTP-Referer": process.env.APP_URL || "https://ai.studio",
            "X-Title": "Hermes Bible"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro", // You can change this to any OpenRouter model
            messages: messages,
            temperature: 0.7,
          })
        });

        if (!openRouterResponse.ok) {
          const errText = await openRouterResponse.text();
          throw new Error(`OpenRouter API Error: ${openRouterResponse.status} ${errText}`);
        }

        const data = await openRouterResponse.json();
        const text = data.choices?.[0]?.message?.content || "";
        res.json({ text });

      } else if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const contents = history.map((m: any) => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          parts: m.parts 
        })).concat([{ role: 'user', parts: [{ text: message }] }]);

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: contents, // The SDK accepts an array of messages
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          }
        });

        res.json({ text: response.text });
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err: any) {
      console.error("Error in chat api:", err);
      res.status(500).json({ error: err.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
