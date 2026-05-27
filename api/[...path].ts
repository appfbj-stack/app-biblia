import { GoogleGenAI } from '@google/genai';

function safeJsonParse(text: string): any {
  let cleaned = text.trim();

  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```[a-zA-Z]*\s*/i, '');
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

async function readBody(req: any) {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function generateJson(systemInstruction: string, prompt: string, temperature = 0.3, model = 'deepseek/deepseek-chat:free') {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openRouterKey) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://app-biblia-ruddy.vercel.app',
        'X-Title': 'Hermes Bible'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return safeJsonParse(data.choices?.[0]?.message?.content || '{}');
  }

  if (geminiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature,
        responseMimeType: 'application/json'
      }
    });

    return safeJsonParse(response.text || '{}');
  }

  throw new Error('Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.');
}

const SYSTEM_INSTRUCTION = `Voce e Hermes, um assistente teologico e biblico criado para ajudar cristaos no estudo das Escrituras (focado na versao NVI).
Voce possui profundo conhecimento de teologia, historia biblica, cultura judaica, hebraico, grego e aramaico.
Aja sempre com sabedoria, clareza, respeito e amor cristao. Nao invente versiculos, sempre cite as referencias biblicas corretamente.`;

function getPath(req: any) {
  const raw = req.query?.path;
  return Array.isArray(raw) ? raw.join('/') : String(raw || '');
}

export default async function handler(req: any, res: any) {
  try {
    const path = getPath(req);

    if (req.method === 'GET' && path === 'health') {
      return res.status(200).json({ status: 'ok' });
    }

    if (req.method === 'GET' && path === 'bible/pt_nvi') {
      const response = await fetch('https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/pt_nvi.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch Bible from source: ${response.status}`);
      }
      return res.status(200).json(await response.json());
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = await readBody(req);

    if (path === 'chat') {
      const { message, history = [], model = 'deepseek/deepseek-chat:free' } = body;
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      if (openRouterKey) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': process.env.APP_URL || 'https://app-biblia-ruddy.vercel.app',
            'X-Title': 'Hermes Bible'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              ...history.map((m: any) => ({ role: m.role, content: m.parts?.[0]?.text || '' })),
              { role: 'user', content: message }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return res.status(200).json({ text: data.choices?.[0]?.message?.content || '' });
      }

      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const contents = history
          .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: m.parts }))
          .concat([{ role: 'user', parts: [{ text: message }] }]);
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents,
          config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 }
        });

        return res.status(200).json({ text: response.text });
      }

      throw new Error('Neither OPENROUTER_API_KEY nor GEMINI_API_KEY environment variable is configured.');
    }

    if (path === 'dictionary') {
      const { word, verseText, book, chapter, verse } = body;
      if (!word) {
        return res.status(400).json({ error: 'Word is required' });
      }

      return res.status(200).json(await generateJson(
        'Voce e um dicionario teologico e biblico erudito. Retorne somente JSON valido com word, language, transliteration, original_term, strong_number, definition e application.',
        `Analise a palavra "${word}" no contexto: ${book} ${chapter}:${verse}. Texto: "${verseText}".`
      ));
    }

    if (path === 'verse-original') {
      const { text, book, chapter, verse } = body;
      return res.status(200).json(await generateJson(
        'Voce e um erudito em linguas originais biblicas. Retorne somente JSON valido com book, chapter, verse, original_language, original_text_unicode, original_text_transliterated, literal_translation_pt, analysis e exegesis_summary.',
        `Analise o original de ${book} ${chapter}:${verse}. Texto traduzido: "${text}".`
      ));
    }

    if (path === 'cross-references') {
      const { book, chapter, verse } = body;
      return res.status(200).json(await generateJson(
        'Voce e um teologo biblico especializado em referencias cruzadas. Retorne somente JSON valido com references.',
        verse
          ? `Forneca de 3 a 5 referencias cruzadas para ${book} ${chapter}:${verse}.`
          : `Forneca de 4 a 7 referencias cruzadas para ${book} ${chapter}.`
      ));
    }

    if (path === 'generate-sermon-outline') {
      const { theme, passage, style, audience } = body;
      return res.status(200).json(await generateJson(
        'Voce e um mentor de homiletica. Retorne somente JSON valido com title, theme, text_reference e content em Markdown.',
        `Gere um esboco de sermao. Tema: ${theme || 'Nao especificado'}. Passagem: ${passage || 'Nao especificado'}. Estilo: ${style || 'Expositivo'}. Publico: ${audience || 'Geral'}.`,
        0.7
      ));
    }

    return res.status(404).json({ error: 'API route not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
