import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
        res.json(safeJsonParse(text));

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
        res.json(safeJsonParse(text));
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
        res.json(safeJsonParse(textRes));

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
        res.json(safeJsonParse(textRes));
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err: any) {
      console.error("Error in verse original api:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cross-references", async (req, res) => {
    try {
      const { book, chapter, verse } = req.body;
      if (!book || !chapter) {
        return res.status(400).json({ error: "Book and chapter are required" });
      }

      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const SYSTEM_INSTRUCTION_CROSS_REFS = `Você é um renomado erudito e teólogo bíblico especializado em conexões intertextuais, profecias, referências cruzadas e tipologia (focado na versão NVI) de nome Hermes.
Sua missão é fornecer uma lista qualificada de versículos bíblicos relacionados (referências cruzadas) para a passagem solicitada.
Cada referência cruzada deve demonstrar uma real conexão espiritual, doutrinária, profética, tipológica ou cumprimento de aliança.

O retorno DEVE ser um objeto JSON válido, contendo uma lista de referências, com a seguinte estrutura de propriedades EXATA:
{
  "references": [
    {
      "source_verse": "Passagem de origem, ex: João 3:16",
      "source_verse_num": 16,
      "target_reference": "Passagem relacionada, ex: Gênesis 22:2",
      "target_text": "O texto bíblico completo do versículo relacionado em Português (NVI)",
      "explanation": "Uma explicação teológica rica de 1 a 2 frases conectando as duas passagens, detalhando a relação doutrinária, hermenêutica, profética ou tipológica."
    }
  ]
}`;

      let prompt = "";
      if (verse) {
        prompt = `Forneça de 3 a 5 referências cruzadas de alta qualidade especificamente para o versículo:
Livro: ${book}
Capítulo: ${chapter}
Versículo: ${verse}

Retorne estritamente o objeto JSON com o array de referências.`;
      } else {
        prompt = `Forneça de 4 a 7 referências cruzadas das passagens mais teologicamente significativas contidas em todo o capítulo:
Livro: ${book}
Capítulo: ${chapter}

Selecione versículos variados do capítulo para criar as referências de origem. Retorne estritamente o objeto JSON de referências.`;
      }

      if (openRouterKey) {
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION_CROSS_REFS },
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
        res.json(safeJsonParse(textRes));

      } else if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_CROSS_REFS,
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        });

        const textRes = response.text || "{}";
        res.json(safeJsonParse(textRes));
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err: any) {
      console.error("Error in cross references api:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/generate-sermon-outline", async (req, res) => {
    try {
      const { theme, passage, style, audience } = req.body;
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const SYSTEM_INSTRUCTION_SERMON = `Você é um refinado conselheiro de pastores, erudito e teólogo bíblico experiente chamado Hermes, mentor de homilética de renome internacional.
Sua missão é ajudar pastores, líderes e pregadores a elaborarem esboços de sermão inesquecíveis, de grande profundidade exegética, teológica, inspiradora e de fácil assimilação prática.

O retorno DEVE ser um objeto JSON válido contendo:
{
  "title": "O título sugerido do sermão",
  "theme": "O tema central",
  "text_reference": "A passagem bíblica",
  "content": "O corpo completo do esboço estruturado em Markdown com introdução, tópicos com explicações + aplicações teológicas, e conclusão."
}`;

      const prompt = `Gere do zero um maravilhoso esboço de sermão estruturado.
Tópico/Tema desejado: ${theme || "Não especificado"}
Passagem Bíblica indicada: ${passage || "Não especificado"}
Estilo Homilético: ${style || "Expositivo"}
Público Alvo: ${audience || "Geral"}

O esboço em Markdown dentro da propriedade "content" deve conter:
- Introdução (Quebra-gelo, Gancho, Relevância Prática)
- Divisões Principais (Tópicos do Esboço: 3 ou 4 pontos). Para cada ponto:
  - Título do tópico
  - Explicação teológica / exegética
  - Aplicação prática cotidiana
  - Ilustração sugerida para enriquecer a pregação
- Conclusão (Resumo dos pontos, Chamado prático à ação e oração final)

Retorne estritamente o objeto JSON válido.`;

      if (openRouterKey) {
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION_SERMON },
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
            temperature: 0.7,
          })
        });

        if (!openRouterResponse.ok) {
          const errText = await openRouterResponse.text();
          throw new Error(`OpenRouter API Error: ${openRouterResponse.status} ${errText}`);
        }

        const data = await openRouterResponse.json();
        const textRes = data.choices?.[0]?.message?.content || "{}";
        res.json(safeJsonParse(textRes));

      } else if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_SERMON,
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        });

        const textRes = response.text || "{}";
        res.json(safeJsonParse(textRes));
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err: any) {
      console.error("Error in generate-sermon-outline api:", err);
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
    const publicPath = path.join(process.cwd(), "public");
    
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
    
    // Fallback to public directory if not found in dist
    app.use(express.static(publicPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
