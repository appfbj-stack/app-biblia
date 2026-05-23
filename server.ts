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

      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const SYSTEM_INSTRUCTION_DICT = `Você é um dicionário teológico e bíblico erudito e preciso chamado Hermes.
Você analisa a palavra solicitada no contexto do versículo bíblico fornecido e do livro correspondente.
Se o livro for do Antigo Testamento, seu significado original deve ser buscado no Hebraico ou Aramaico.
Se o livro for do Novo Testamento, seu significado original deve ser buscado no Grego (Koiné).

Forneça sua resposta obrigatoriamente em formato de objeto JSON válido, com a seguinte estrutura:
{
  "word": "Palavra limpa em português",
  "language": "Idioma original (Hebraico / Grego / Aramaico)",
  "transliteration": "Transliteração (ex: logos / bereshit)",
  "original_term": "Termo no alfabeto oficial original (ex: λόγος ou בְּרֵaשִׁית)",
  "strong_number": "Número de Strong se conhecido (tipo G3056, H7225)",
  "definition": "Definição teológica detalhada no contexto do versículo",
  "application": "Aplicação espiritual prática para a vida cristã hoje"
}`;

      const prompt = `Analise a palavra "${word}" presente no versículo:
Livro: ${book}
Capítulo: ${chapter}
Versículo: ${verse}
Texto: "${verseText}"

Retorne estritamente o objeto JSON contendo as informações originais e a definição teológica.`;

      if (openRouterKey) {
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION_DICT },
          { role: "user", content: prompt }
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
            model: "deepseek/deepseek-chat:free",
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.3,
          })
        });

        if (!openRouterResponse.ok) {
          const errText = await openRouterResponse.text();
          throw new Error(`OpenRouter API Error: ${openRouterResponse.status} ${errText}`);
        }

        const data = await openRouterResponse.json();
        const text = data.choices?.[0]?.message?.content || "{}";
        res.json(JSON.parse(text));

      } else if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_DICT,
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        });

        const text = response.text || "{}";
        res.json(JSON.parse(text));
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err: any) {
      console.error("Error in dictionary api:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/verse-original", async (req, res) => {
    try {
      const { text, book, chapter, verse } = req.body;
      if (!text || !book || !chapter || !verse) {
        return res.status(400).json({ error: "All properties (text, book, chapter, verse) are required" });
      }

      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const SYSTEM_INSTRUCTION_ORIGINAL = `Você é um erudito em línguas originais bíblicas (Grego Koiné, Hebraico Bíblico e Aramaico) chamado Hermes.
O usuário lhe dará um versículo traduzido em Português.
Sua missão é fornecer a tradução original correspondente e uma análise detalhada palavra por palavra (interlinear ou termos chave) com transliteração, morfologia, significado e notas exegéticas fundamentadas.

O retorno DEVE ser um objeto JSON válido, com a seguinte estrutura:
{
  "book": "Nome do Livro",
  "chapter": número,
  "verse": número,
  "original_language": "Hebraico" ou "Grego" ou "Aramaico",
  "original_text_unicode": "O texto completo no alfabeto original (com pontuação massorética ou acentuação grega completa)",
  "original_text_transliterated": "A pronúncia/transliteração fonética legível do versículo inteiro",
  "literal_translation_pt": "Sua tradução literal direta das línguas originais para o português",
  "analysis": [
    {
      "term": "Termo original (grego/hebraico)",
      "transliteration": "Transliteração",
      "strong": "Número de Strong (opcional, ex: H7225, G3056)",
      "morfologia": "Classe gramatical / Morfologia curta em português",
      "meaning": "Significado literal básico",
      "explanation": "Significado teológico ou nuance específica no contexto do versículo"
    }
  ],
  "exegesis_summary": "Uma explicação exegética e teológica do versículo, resumindo a mensagem central e revelando profundidades perdidas na tradução padrão."
}`;

      const prompt = `Traduza para o original e analise o versículo:
Livro: ${book}
Capítulo: ${chapter}
Versículo: ${verse}
Texto traduzido em português: "${text}"

Retorne estritamente o JSON descrito nas instruções do sistema.`;

      if (openRouterKey) {
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION_ORIGINAL },
          { role: "user", content: prompt }
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
            model: "deepseek/deepseek-chat:free",
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.3,
          })
        });

        if (!openRouterResponse.ok) {
          const errText = await openRouterResponse.text();
          throw new Error(`OpenRouter API Error: ${openRouterResponse.status} ${errText}`);
        }

        const data = await openRouterResponse.json();
        const textRes = data.choices?.[0]?.message?.content || "{}";
        res.json(JSON.parse(textRes));

      } else if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_ORIGINAL,
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        });

        const textRes = response.text || "{}";
        res.json(JSON.parse(textRes));
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err: any) {
      console.error("Error in verse original api:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, model } = req.body;
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const selectedModel = model || "deepseek/deepseek-chat:free";

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
            model: selectedModel,
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
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (filePath.endsWith('.js') && filePath.includes('sw')) {
          res.setHeader('Service-Worker-Allowed', '/');
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
