import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

function safeJsonParse(text: string): any {
    let cleaned = text.trim();

  // Strip Markdown code fence if present
  const jsonStartRegex = /^```json\s*/i;
    const genericCodeStartRegex = /^```[a-zA-Z]*\s*/;

  if (jsonStartRegex.test(cleaned)) {
        cleaned = cleaned.replace(jsonStartRegex, "");
  } else if (genericCodeStartRegex.test(cleaned)) {
        cleaned = cleaned.replace(genericCodeStartRegex, "");
  }

  if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Extract JSON block in case of surrounding text
  const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

const SYSTEM_INSTRUCTION = `Voce e Hermes, um assistente teologico e biblico criado para ajudar cristaos no estudo das Escrituras (focado na versao NVI).
Voce possui profundo conhecimento de teologia, historia biblica, cultura judaica, hebraico, grego e aramaico.
Aja sempre com sabedoria, clareza, respeito e amor cristao. Nao invente versiculos, sempre cite as referencias biblicas corretamente.`;

async function callOpenRouter(messages: any[], systemInstruction: string, model: string = "deepseek/deepseek-chat-v3-0324:free"): Promise<string> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
          throw new Error("OPENROUTER_API_KEY environment variable is not configured.");
    }

  const body = {
        model,
        messages: [
          { role: "system", content: systemInstruction },
                ...messages
              ],
        temperature: 0.7,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL || "https://biblia.fbautomacao.space",
                "X-Title": "Hermes Bible App",
        },
        body: JSON.stringify(body),
  });

  if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

async function startServer() {
    const app = express();
    const PORT = parseInt(process.env.PORT || "4000", 10);

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
        res.json({ status: "ok" });
  });

  app.post("/api/save-pwa-icons", async (req, res) => {
        try {
                const { icon192, icon512 } = req.body;
                const fs = await import("fs/promises");

          const writeIcon = async (filename: string, base64Str: string) => {
                    const base64Data = base64Str.replace(/^data:image\/?[a-z]*;base64,/, "");

                    // Write to public/
                    try {
                                await fs.writeFile(path.join(process.cwd(), "public", filename), base64Data, "base64");
                    } catch (e) {
                                console.error(`Failed to write to public/${filename}`, e);
                    }

                    // Also write to dist/ in case we are running in production from dist
                    try {
                                await fs.writeFile(path.join(process.cwd(), "dist", filename), base64Data, "base64");
                    } catch (e) {
                                // dist may not exist yet, ignore
                    }
          };

          if (icon192) {
                    await writeIcon("icon-192.png", icon192);
          }
                if (icon512) {
                          await writeIcon("icon-512.png", icon512);
                }
                res.json({ success: true });
        } catch (e: any) {
                console.error("Error saving PWA icons:", e);
                res.status(500).json({ error: e.message });
        }
  });

  app.get("/api/bible/pt_nvi", async (req, res) => {
        try {
                const fetchReq = await fetch("https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/pt_nvi.json");
                if (!fetchReq.ok) {
                          throw new Error(`Failed to fetch Bible from source: ${fetchReq.status}`);
                }
                const data = await fetchReq.json();
                res.json(data);
        } catch (e: any) {
                console.error("Error fetching Bible proxy:", e);
                res.status(500).json({ error: e.message });
        }
  });

  app.post("/api/dictionary", async (req, res) => {
        try {
                const { word, verseText, book, chapter, verse } = req.body;
                if (!word) {
                          return res.status(400).json({ error: "Word is required" });
                }

          const SYSTEM_INSTRUCTION_DICT = `Voce e um dicionario teologico e biblico erudito e preciso chamado Hermes.
          Voce analisa a palavra solicitada no contexto do versiculo biblico fornecido e do livro correspondente.
          Se o livro for do Antigo Testamento, seu significado original deve ser buscado no Hebraico ou Aramaico.
          Se o livro for do Novo Testamento, seu significado original deve ser buscado no Grego (Koine).
          Forneca sua resposta obrigatoriamente em formato de objeto JSON valido, com a seguinte estrutura:
          {
            "word": "Palavra limpa em portugues",
              "language": "Idioma original (Hebraico / Grego / Aramaico)",
                "transliteration": "Transliteracao (ex: logos / bereshit)",
                  "meaning": "Significado profundo e contextualizado em portugues",
                    "context": "Como essa palavra se aplica especificamente ao versiculo citado",
                      "theological": "Relevancia teologica e doutrinaria da palavra",
                        "usage": ["Outro uso biblico relevante 1", "Outro uso biblico relevante 2"]
                        }`;

          const userMessage = `Analise a palavra "${word}" no contexto: "${verseText}" (${book} ${chapter}:${verse})`;

          const rawText = await callOpenRouter(
                    [{ role: "user", content: userMessage }],
                    SYSTEM_INSTRUCTION_DICT
                  );

          const parsed = safeJsonParse(rawText);
                res.json(parsed);
        } catch (err: any) {
                console.error("Error in dictionary api:", err);
                res.status(500).json({ error: err.message });
        }
  });

  app.post("/api/generate-sermon-outline", async (req, res) => {
        try {
                const { verseRef, verseText, book, chapter, verse, theme } = req.body;
                if (!verseRef || !verseText) {
                          return res.status(400).json({ error: "verseRef and verseText are required" });
                }

          const SYSTEM_INSTRUCTION_SERMON = `Voce e Hermes, um assistente especialista em homiletica crista e exegese biblica.
          Voce cria esbocos de sermoes detalhados, profundos e biblicamente fundamentados.
          Forneca sua resposta obrigatoriamente em formato de objeto JSON valido, com a seguinte estrutura:
          {
            "title": "Titulo do sermao",
              "theme": "Tema central",
                "introduction": "Introducao cativante (2-3 paragrafos)",
                  "points": [
                      {
                            "title": "Titulo do ponto 1",
                                  "content": "Desenvolvimento do ponto 1",
                                        "verses": ["Referencia biblica de apoio"]
                                            }
                                              ],
                                                "conclusion": "Conclusao e apelo",
                                                  "prayer": "Sugestao de oracao final"
                                                  }`;

          const userMessage = `Crie um esboco de sermao baseado em: ${verseRef} - "${verseText}"${theme ? `. Tema sugerido: ${theme}` : ""}`;

          const rawText = await callOpenRouter(
                    [{ role: "user", content: userMessage }],
                    SYSTEM_INSTRUCTION_SERMON
                  );

          const parsed = safeJsonParse(rawText);
                res.json(parsed);
        } catch (err: any) {
                console.error("Error in generate-sermon-outline api:", err);
                res.status(500).json({ error: err.message });
        }
  });

  app.post("/api/chat", async (req, res) => {
        try {
                const { message, history, model } = req.body;
                if (!message) {
                          return res.status(400).json({ error: "Message is required" });
                }

          const selectedModel = model || "deepseek/deepseek-chat-v3-0324:free";

          // Build messages array from history
          const messages = (history || []).map((m: any) => ({
                    role: m.role === "assistant" ? "assistant" : "user",
                    content: typeof m.parts === "string" ? m.parts : m.parts?.map((p: any) => p.text).join("") || "",
          }));

          messages.push({ role: "user", content: message });

          const responseText = await callOpenRouter(messages, SYSTEM_INSTRUCTION, selectedModel);
                res.json({ text: responseText });
        } catch (err: any) {
                console.error("Error in chat api:", err);
                res.status(500).json({ error: err.message });
        }
  });

  // In production, serve static files from dist/
  if (process.env.NODE_ENV === "production") {
        const distPath = path.join(process.cwd(), "dist");

      function setHeaders(res: express.Response, filePath: string) {
              if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs")) {
                        res.setHeader("Content-Type", "application/javascript");
              } else if (filePath.endsWith(".css")) {
                        res.setHeader("Content-Type", "text/css");
              } else if (filePath.endsWith(".webmanifest") || filePath.endsWith(".json")) {
                        res.setHeader("Content-Type", "application/json");
              }
      }

      app.use(express.static(distPath, { setHeaders }));

      // SPA fallback - serve index.html for all non-API routes
      app.get("*", (req, res) => {
              if (!req.path.startsWith("/api/")) {
                        res.sendFile(path.join(distPath, "index.html"));
              }
      });
  } else {
        // In development, use Vite dev server
      const vite = await createViteServer({
              server: { middlewareMode: true },
              appType: "spa",
      });
        app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
