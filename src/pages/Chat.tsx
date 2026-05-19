import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { sendMessageToHermes } from "../services/hermes";

export default function Chat() {
  const [selectedModel, setSelectedModel] = useState("deepseek/deepseek-chat:free");
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', text: 'Graça e paz! Sou Hermes, seu assistente bíblico. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsgText = input.trim();
    setInput('');
    const newMessages = [...messages, { id: Date.now(), role: 'user', text: userMsgText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Map to proper history format for the service
      const history = messages.map(m => ({ 
        role: m.role, 
        parts: [{ text: m.text }] 
      }));
      
      const responseText = await sendMessageToHermes(userMsgText, history, selectedModel);
      
      setMessages([...newMessages, { id: Date.now() + 1, role: 'assistant', text: responseText || '' }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { id: Date.now() + 1, role: 'assistant', text: 'Perdão, estou tendo dificuldades de me conectar agora. Por favor, verifique a chave de API ou tente novamente em instantes.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-[#1C2026] rounded-2xl shadow-sm border border-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-[#16191E] text-[#E2E8F0] p-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h2 className="font-bold text-lg flex items-center justify-center sm:justify-start gap-2">
            Hermes IA
          </h2>
          <p className="text-[#C5A059] text-xs mt-1 uppercase tracking-widest font-medium">Inteligência Bíblica</p>
        </div>
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all cursor-pointer"
        >
          <option value="deepseek/deepseek-chat:free">DeepSeek V3 (Free)</option>
          <option value="deepseek/deepseek-r1:free">DeepSeek R1 (Free)</option>
          <option value="google/gemini-2.0-flash-lite-preview-02-05:free">Gemini 2.0 Flash Lite (Free)</option>
          <option value="google/gemini-2.0-pro-exp-02-05:free">Gemini 2.0 Pro Exp (Free)</option>
          <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0F1115]">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-white/10 text-[#94A3B8]" : "bg-gradient-to-br from-[#C5A059] to-[#8E6E37] text-[#0F1115]"
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "text-[#94A3B8] text-right" 
                : "bg-white/5 border-l-2 border-[#C5A059] text-[#E2E8F0]"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-[85%]">
             <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#C5A059] to-[#8E6E37] text-[#0F1115]">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border-l-2 border-[#C5A059] flex items-center gap-2 text-[#94A3B8] text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Hermes está refletindo...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-[#1C2026] border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao Hermes..."
            className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059]/50 transition-all placeholder:text-[#94A3B8]"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-[#C5A059] text-[#0F1115] rounded-full hover:bg-[#C5A059]/90 transition-colors disabled:opacity-50 disabled:hover:bg-[#C5A059]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}