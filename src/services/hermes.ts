export const SYSTEM_INSTRUCTION = `Você é Hermes, um assistente teológico e bíblico criado para ajudar cristãos no estudo das Escrituras (focado na versão NVI).
Você possui profundo conhecimento de teologia, história bíblica, cultura judaica, hebraico, grego e aramaico.
Aja sempre com sabedoria, clareza, respeito e amor cristão. Não invente versículos, sempre cite as referências bíblicas corretamente.`;

export async function sendMessageToHermes(message: string, history: {role: string, parts: {text: string}[]}[] = []) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to talk to Hermes");
  }

  const data = await response.json();
  return data.text;
}
