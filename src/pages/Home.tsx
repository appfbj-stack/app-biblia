import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { BookOpen, Sparkles, MessageSquare, StickyNote, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const booksCount = useLiveQuery(() => db.books.count(), []);
  
  const totalChapters = useLiveQuery(async () => {
    const books = await db.books.toArray();
    return books.reduce((acc, book) => acc + book.chapters, 0);
  }, []) || 1189;
  
  const readChaptersCount = useLiveQuery(() => db.read_chapters.count(), []) || 0;
  const progressPercent = Math.round((readChaptersCount / totalChapters) * 100);

  const recentNotes = useLiveQuery(() => db.notes.orderBy('updated_at').reverse().limit(3).toArray(), []) || [];

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
        <Link to="/bible" className="group bg-[#1C2026] p-6 rounded-2xl border border-white/5 hover:bg-white/5 transition-all text-left block">
          <div className="flex justify-between items-start mb-4">
            <BookOpen className="w-8 h-8 text-[#94A3B8] group-hover:text-[#C5A059] transition-colors" />
            <div className="text-right">
              <span className="text-[#C5A059] font-bold">{progressPercent}%</span>
              <span className="text-xs text-[#94A3B8] block">lido</span>
            </div>
          </div>
          <h4 className="font-semibold text-lg text-[#E2E8F0]">Continuar Leitura</h4>
          <p className="text-[#94A3B8] text-sm mt-1 mb-4">Acessar as escrituras livremente.</p>
          <div className="w-full h-1.5 bg-[#0F1115] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#C5A059] rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </Link>
        
        <Link to="/chat" className="group bg-[#1C2026] p-6 rounded-2xl border border-white/5 hover:bg-white/5 transition-all block">
          <MessageSquare className="w-8 h-8 text-[#94A3B8] group-hover:text-[#C5A059] transition-colors mb-4" />
          <h4 className="font-semibold text-lg text-[#E2E8F0]">Falar com Hermes</h4>
          <p className="text-[#94A3B8] text-sm mt-1">Tire dúvidas ou crie esboços com IA.</p>
        </Link>
      </div>
      
      {recentNotes.length > 0 && (
        <section className="bg-[#1C2026] rounded-2xl p-6 md:p-8 border border-white/5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-[#C5A059]" />
              Minhas Anotações Recentes
            </h3>
          </div>
          <div className="grid gap-3">
            {recentNotes.map(note => (
              <div 
                key={note.id} 
                className="bg-[#08090B] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col cursor-pointer group"
                onClick={() => {
                  if (note.book_name) {
                    navigate('/bible', { state: { book: note.book_name, chapter: note.chapter }});
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-semibold text-[#C5A059] uppercase tracking-wider group-hover:text-[#D4AF68] transition-colors flex items-center gap-1">
                    {note.book_name} {note.chapter}:{note.verse}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                  </span>
                  <span className="text-xs text-[#94A3B8]">{new Date(note.updated_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[#E2E8F0] line-clamp-2 text-sm">{note.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="pt-8 text-center text-sm text-[#94A3B8]">
        Status do banco local: {booksCount !== undefined ? `${booksCount} livros carregados.` : 'Carregando...'}
      </div>
    </div>
  );
}
