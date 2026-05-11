import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from the environment
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export const SYSTEM_INSTRUCTION = `Você é Hermes, um assistente teológico e bíblico criado para ajudar cristãos no estudo das Escrituras (focado na versão NVI).
Você possui profundo conhecimento de teologia, história bíblica, cultura judaica, hebraico, grego e aramaico.
Aja sempre com sabedoria, clareza, respeito e amor cristão. Não invente versículos, sempre cite as referências bíblicas corretamente.`;

export async function sendMessageToHermes(message: string, history: {role: string, parts: {text: string}[]}[] = []) {
  const ai = getAIClient();
  
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    }
  });

  // Small hack: if we want to preload history, we currently have to do it by creating the chat, but `@google/genai` manages history internally. 
  // For standard SDK, if `history` is provided, we can pass it during `create`.
  // Wait, the new SDK `ai.chats.create` handles history optionally in `config`. Let's just pass `systemInstruction` in config, 
  // and we might need to recreate the history manually or just send the current message since it's a simple start.
  // Given the API limitations, let's just make it a simple `generateContent` if history managing is tricky, 
  // or use `chat.sendMessageStream()`.
  
  // For now, let's do generateContent with conversational format:
  const contents = history.map(m => ({ 
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

  return response.text;
}
