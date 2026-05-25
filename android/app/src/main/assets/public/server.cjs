var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
function safeJsonParse(text) {
  let cleaned = text.trim();
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
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}
var SYSTEM_INSTRUCTION = `Voc\xEA \xE9 Hermes, um assistente teol\xF3gico e b\xEDblico criado para ajudar crist\xE3os no estudo das Escrituras (focado na vers\xE3o NVI).
Voc\xEA possui profundo conhecimento de teologia, hist\xF3ria b\xEDblica, cultura judaica, hebraico, grego e aramaico.
Aja sempre com sabedoria, clareza, respeito e amor crist\xE3o. N\xE3o invente vers\xEDculos, sempre cite as refer\xEAncias b\xEDblicas corretamente.`;
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/save-pwa-icons", async (req, res) => {
    try {
      const { icon192, icon512 } = req.body;
      const fs = await import("fs/promises");
      const writeIcon = async (filename, base64Str) => {
        const base64Data = base64Str.replace(/^data:image\/?[a-z]*;base64,/, "");
        try {
          await fs.writeFile(import_path.default.join(process.cwd(), "public", filename), base64Data, "base64");
        } catch (e) {
          console.error(`Failed to write to public/${filename}`, e);
        }
        try {
          await fs.writeFile(import_path.default.join(process.cwd(), "dist", filename), base64Data, "base64");
        } catch (e) {
        }
      };
      if (icon192) {
        await writeIcon("icon-192.png", icon192);
      }
      if (icon512) {
        await writeIcon("icon-512.png", icon512);
      }
      res.json({ success: true });
    } catch (e) {
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
    } catch (e) {
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
      const SYSTEM_INSTRUCTION_DICT = `Voc\xEA \xE9 um dicion\xE1rio teol\xF3gico e b\xEDblico erudito e preciso chamado Hermes.
Voc\xEA analisa a palavra solicitada no contexto do vers\xEDculo b\xEDblico fornecido e do livro correspondente.
Se o livro for do Antigo Testamento, seu significado original deve ser buscado no Hebraico ou Aramaico.
Se o livro for do Novo Testamento, seu significado original deve ser buscado no Grego (Koin\xE9).

Forne\xE7a sua resposta obrigatoriamente em formato de objeto JSON v\xE1lido, com a seguinte estrutura:
{
  "word": "Palavra limpa em portugu\xEAs",
  "language": "Idioma original (Hebraico / Grego / Aramaico)",
  "transliteration": "Translitera\xE7\xE3o (ex: logos / bereshit)",
  "original_term": "Termo no alfabeto oficial original (ex: \u03BB\u03CC\u03B3\u03BF\u03C2 ou \u05D1\u05B0\u05BC\u05E8\u05B5a\u05E9\u05B4\u05C1\u05D9\u05EA)",
  "strong_number": "N\xFAmero de Strong se conhecido (tipo G3056, H7225)",
  "definition": "Defini\xE7\xE3o teol\xF3gica detalhada no contexto do vers\xEDculo",
  "application": "Aplica\xE7\xE3o espiritual pr\xE1tica para a vida crist\xE3 hoje"
}`;
      const prompt = `Analise a palavra "${word}" presente no vers\xEDculo:
Livro: ${book}
Cap\xEDtulo: ${chapter}
Vers\xEDculo: ${verse}
Texto: "${verseText}"

Retorne estritamente o objeto JSON contendo as informa\xE7\xF5es originais e a defini\xE7\xE3o teol\xF3gica.`;
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
            messages,
            response_format: { type: "json_object" },
            temperature: 0.3
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
        const ai = new import_genai.GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
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
    } catch (err) {
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
      const SYSTEM_INSTRUCTION_ORIGINAL = `Voc\xEA \xE9 um erudito em l\xEDnguas originais b\xEDblicas (Grego Koin\xE9, Hebraico B\xEDblico e Aramaico) chamado Hermes.
O usu\xE1rio lhe dar\xE1 um vers\xEDculo traduzido em Portugu\xEAs.
Sua miss\xE3o \xE9 fornecer a tradu\xE7\xE3o original correspondente e uma an\xE1lise detalhada palavra por palavra (interlinear ou termos chave) com translitera\xE7\xE3o, morfologia, significado e notas exeg\xE9ticas fundamentadas.

O retorno DEVE ser um objeto JSON v\xE1lido, com a seguinte estrutura:
{
  "book": "Nome do Livro",
  "chapter": n\xFAmero,
  "verse": n\xFAmero,
  "original_language": "Hebraico" ou "Grego" ou "Aramaico",
  "original_text_unicode": "O texto completo no alfabeto original (com pontua\xE7\xE3o massor\xE9tica ou acentua\xE7\xE3o grega completa)",
  "original_text_transliterated": "A pron\xFAncia/translitera\xE7\xE3o fon\xE9tica leg\xEDvel do vers\xEDculo inteiro",
  "literal_translation_pt": "Sua tradu\xE7\xE3o literal direta das l\xEDnguas originais para o portugu\xEAs",
  "analysis": [
    {
      "term": "Termo original (grego/hebraico)",
      "transliteration": "Translitera\xE7\xE3o",
      "strong": "N\xFAmero de Strong (opcional, ex: H7225, G3056)",
      "morfologia": "Classe gramatical / Morfologia curta em portugu\xEAs",
      "meaning": "Significado literal b\xE1sico",
      "explanation": "Significado teol\xF3gico ou nuance espec\xEDfica no contexto do vers\xEDculo"
    }
  ],
  "exegesis_summary": "Uma explica\xE7\xE3o exeg\xE9tica e teol\xF3gica do vers\xEDculo, resumindo a mensagem central e revelando profundidades perdidas na tradu\xE7\xE3o padr\xE3o."
}`;
      const prompt = `Traduza para o original e analise o vers\xEDculo:
Livro: ${book}
Cap\xEDtulo: ${chapter}
Vers\xEDculo: ${verse}
Texto traduzido em portugu\xEAs: "${text}"

Retorne estritamente o JSON descrito nas instru\xE7\xF5es do sistema.`;
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
            messages,
            response_format: { type: "json_object" },
            temperature: 0.3
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
        const ai = new import_genai.GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
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
    } catch (err) {
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
      const SYSTEM_INSTRUCTION_CROSS_REFS = `Voc\xEA \xE9 um renomado erudito e te\xF3logo b\xEDblico especializado em conex\xF5es intertextuais, profecias, refer\xEAncias cruzadas e tipologia (focado na vers\xE3o NVI) de nome Hermes.
Sua miss\xE3o \xE9 fornecer uma lista qualificada de vers\xEDculos b\xEDblicos relacionados (refer\xEAncias cruzadas) para a passagem solicitada.
Cada refer\xEAncia cruzada deve demonstrar uma real conex\xE3o espiritual, doutrin\xE1ria, prof\xE9tica, tipol\xF3gica ou cumprimento de alian\xE7a.

O retorno DEVE ser um objeto JSON v\xE1lido, contendo uma lista de refer\xEAncias, com a seguinte estrutura de propriedades EXATA:
{
  "references": [
    {
      "source_verse": "Passagem de origem, ex: Jo\xE3o 3:16",
      "source_verse_num": 16,
      "target_reference": "Passagem relacionada, ex: G\xEAnesis 22:2",
      "target_text": "O texto b\xEDblico completo do vers\xEDculo relacionado em Portugu\xEAs (NVI)",
      "explanation": "Uma explica\xE7\xE3o teol\xF3gica rica de 1 a 2 frases conectando as duas passagens, detalhando a rela\xE7\xE3o doutrin\xE1ria, hermen\xEAutica, prof\xE9tica ou tipol\xF3gica."
    }
  ]
}`;
      let prompt = "";
      if (verse) {
        prompt = `Forne\xE7a de 3 a 5 refer\xEAncias cruzadas de alta qualidade especificamente para o vers\xEDculo:
Livro: ${book}
Cap\xEDtulo: ${chapter}
Vers\xEDculo: ${verse}

Retorne estritamente o objeto JSON com o array de refer\xEAncias.`;
      } else {
        prompt = `Forne\xE7a de 4 a 7 refer\xEAncias cruzadas das passagens mais teologicamente significativas contidas em todo o cap\xEDtulo:
Livro: ${book}
Cap\xEDtulo: ${chapter}

Selecione vers\xEDculos variados do cap\xEDtulo para criar as refer\xEAncias de origem. Retorne estritamente o objeto JSON de refer\xEAncias.`;
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
            messages,
            response_format: { type: "json_object" },
            temperature: 0.3
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
        const ai = new import_genai.GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
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
    } catch (err) {
      console.error("Error in cross references api:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/generate-sermon-outline", async (req, res) => {
    try {
      const { theme, passage, style, audience } = req.body;
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;
      const SYSTEM_INSTRUCTION_SERMON = `Voc\xEA \xE9 um refinado conselheiro de pastores, erudito e te\xF3logo b\xEDblico experiente chamado Hermes, mentor de homil\xE9tica de renome internacional.
Sua miss\xE3o \xE9 ajudar pastores, l\xEDderes e pregadores a elaborarem esbo\xE7os de serm\xE3o inesquec\xEDveis, de grande profundidade exeg\xE9tica, teol\xF3gica, inspiradora e de f\xE1cil assimila\xE7\xE3o pr\xE1tica.

O retorno DEVE ser um objeto JSON v\xE1lido contendo:
{
  "title": "O t\xEDtulo sugerido do serm\xE3o",
  "theme": "O tema central",
  "text_reference": "A passagem b\xEDblica",
  "content": "O corpo completo do esbo\xE7o estruturado em Markdown com introdu\xE7\xE3o, t\xF3picos com explica\xE7\xF5es + aplica\xE7\xF5es teol\xF3gicas, e conclus\xE3o."
}`;
      const prompt = `Gere do zero um maravilhoso esbo\xE7o de serm\xE3o estruturado.
T\xF3pico/Tema desejado: ${theme || "N\xE3o especificado"}
Passagem B\xEDblica indicada: ${passage || "N\xE3o especificado"}
Estilo Homil\xE9tico: ${style || "Expositivo"}
P\xFAblico Alvo: ${audience || "Geral"}

O esbo\xE7o em Markdown dentro da propriedade "content" deve conter:
- Introdu\xE7\xE3o (Quebra-gelo, Gancho, Relev\xE2ncia Pr\xE1tica)
- Divis\xF5es Principais (T\xF3picos do Esbo\xE7o: 3 ou 4 pontos). Para cada ponto:
  - T\xEDtulo do t\xF3pico
  - Explica\xE7\xE3o teol\xF3gica / exeg\xE9tica
  - Aplica\xE7\xE3o pr\xE1tica cotidiana
  - Ilustra\xE7\xE3o sugerida para enriquecer a prega\xE7\xE3o
- Conclus\xE3o (Resumo dos pontos, Chamado pr\xE1tico \xE0 a\xE7\xE3o e ora\xE7\xE3o final)

Retorne estritamente o objeto JSON v\xE1lido.`;
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
            messages,
            response_format: { type: "json_object" },
            temperature: 0.7
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
        const ai = new import_genai.GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
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
    } catch (err) {
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
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION },
          ...history.map((m) => ({
            role: m.role,
            // frontend uses 'user' or 'assistant', which is perfect for OpenRouter
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
            messages,
            temperature: 0.7
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
        const ai = new import_genai.GoogleGenAI({ apiKey: geminiKey });
        const contents = history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: m.parts
        })).concat([{ role: "user", parts: [{ text: message }] }]);
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents,
          // The SDK accepts an array of messages
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7
          }
        });
        res.json({ text: response.text });
      } else {
        throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.");
      }
    } catch (err) {
      console.error("Error in chat api:", err);
      res.status(500).json({ error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    const publicPath = import_path.default.join(process.cwd(), "public");
    app.use(import_express.default.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".webmanifest")) {
          res.setHeader("Content-Type", "application/manifest+json");
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        } else if (filePath.endsWith(".js") && filePath.includes("sw")) {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        }
      }
    }));
    app.use(import_express.default.static(publicPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
