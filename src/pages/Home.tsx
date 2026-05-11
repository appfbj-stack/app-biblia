import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { BookOpen, Sparkles, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const booksCount = useLiveQuery(() => db.books.count(), []);
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-serif font-bold text-[#E2E8F0] tracking-tight">Bom dia</h2>
        <p className="text-[#94A3B8] text-lg">Que a paz do Senhor esteja com você.</p>
      </header>

      <section className="bg-[#1C2026] rounded-2xl p-6 md:p-8 border border-white/5 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A059]/10 text-[#C5A059] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Devocional do Dia
          </div>
          <h3 className="text-2xl font-serif font-semibold text-[#E2E8F0]">O Início de Tudo</h3>
          <p className="text-[#94A3B8] leading-relaxed max-w-xl">
            "No princípio Deus criou os céus e a terra." - Uma lembrança do poder criativo e da soberania do Pai sobre todas as coisas.
          </p>
          <Link to="/bible" className="inline-flex items-center gap-2 bg-[#C5A059] text-[#0F1115] px-5 py-2.5 rounded-lg font-bold hover:bg-[#C5A059]/90 transition-colors">
            Ler Gênesis 1
          </Link>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/bible" className="group bg-[#1C2026] p-6 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
          <BookOpen className="w-8 h-8 text-[#94A3B8] group-hover:text-[#C5A059] transition-colors mb-4" />
          <h4 className="font-semibold text-lg text-[#E2E8F0]">Continuar Leitura</h4>
          <p className="text-[#94A3B8] text-sm mt-1">Você está em Gênesis, Capítulo 1.</p>
        </Link>
        
        <Link to="/chat" className="group bg-[#1C2026] p-6 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
          <MessageSquare className="w-8 h-8 text-[#94A3B8] group-hover:text-[#C5A059] transition-colors mb-4" />
          <h4 className="font-semibold text-lg text-[#E2E8F0]">Falar com Hermes</h4>
          <p className="text-[#94A3B8] text-sm mt-1">Tire dúvidas ou crie esboços com IA.</p>
        </Link>
      </div>
      
      <div className="pt-8 text-center text-sm text-[#94A3B8]">
        Status do banco local: {booksCount !== undefined ? `${booksCount} livros carregados.` : 'Carregando...'}
      </div>
    </div>
  );
}
