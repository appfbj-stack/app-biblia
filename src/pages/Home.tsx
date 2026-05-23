import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { BookOpen, Sparkles, MessageSquare, StickyNote, ChevronRight, History, Download, Search, X, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { InstallPWA } from "../components/InstallPWA";
import React, { useState } from "react";

const highlightResultText = (text: string, search: string) => {
  if (!search.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-[#C5A059]/40 text-[#E2E8F0] font-semibold rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 3) {
      alert("Por favor, digite pelo menos 3 caracteres.");
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const matches = await db.verses
        .filter(v => v.text.toLowerCase().includes(q))
        .toArray();
        
      setTotalMatches(matches.length);
      setSearchResults(matches.slice(0, 100)); // Limit to 100 for great performance
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setIsSearching(false);
    }
  };
  const booksCount = useLiveQuery(() => db.books.count(), []);
  
  const totalChapters = useLiveQuery(async () => {
    const books = await db.books.toArray();
    return books.reduce((acc, book) => acc + book.chapters, 0);
  }, []) || 1189;
  
  const readChaptersCount = useLiveQuery(() => db.read_chapters.count(), []) || 0;
  const progressPercent = Math.round((readChaptersCount / totalChapters) * 100);

  const recentNotes = useLiveQuery(() => db.notes.orderBy('updated_at').reverse().limit(3).toArray(), []) || [];
  const readingHistory = useLiveQuery(() => db.reading_history.orderBy('timestamp').reverse().limit(3).toArray(), []) || [];

  const chaptersWithNotes = useLiveQuery(async () => {
    const allNotes = await db.notes.orderBy('updated_at').reverse().toArray();
    const uniqueChapters = new Map();
    allNotes.forEach(note => {
      const key = `${note.book_name} ${note.chapter}`;
      if (!uniqueChapters.has(key)) {
        uniqueChapters.set(key, {
          book_name: note.book_name,
          chapter: note.chapter,
          updated_at: note.updated_at
        });
      }
    });
    return Array.from(uniqueChapters.values()).slice(0, 3);
  }, []) || [];

  const exportNotas = async () => {
    try {
      const allNotes = await db.notes.toArray();
      const jsonData = JSON.stringify(allNotes, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hermes_notas_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Falha ao exportar notas", e);
      alert("Falha ao exportar as anotações.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold text-[#E2E8F0] tracking-tight">Bom dia</h2>
          <p className="text-[#94A3B8] text-lg">Que a paz do Senhor esteja com você.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={exportNotas}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm font-medium text-[#E2E8F0] border border-white/10 transition-colors"
            title="Exportar Anotações (JSON)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <InstallPWA />
        </div>
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

      {/* Global Search Bar */}
      <section className="bg-[#1C2026] rounded-2xl p-6 md:p-8 border border-white/5 space-y-4">
        <h3 className="text-xl font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
          <Search className="w-5 h-5 text-[#C5A059]" />
          Pesquisa Bíblica Global
        </h3>
        <p className="text-[#94A3B8] text-sm">
          Busque por passagens, palavras ou ensinamentos em todos os livros da Bíblia Sagrada.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: 'criação', 'amor', 'salvação', 'justiça'..."
              className="w-full bg-[#08090B] border border-white/5 focus:border-[#C5A059]/40 rounded-xl pl-10 pr-4 py-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#C5A059]/30 transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-[#C5A059] hover:bg-[#D4AF68] text-[#0F1115] font-bold px-6 py-3 rounded-xl transition-colors shrink-0 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </button>
        </form>
      </section>

      {/* Global Search Results Panel */}
      {hasSearched && (
        <section className="bg-[#1C2026] rounded-2xl p-6 md:p-8 border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl font-serif font-semibold text-[#E2E8F0]">
                Resultados da Busca
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                {isSearching ? (
                  "Buscando no banco de dados..."
                ) : (
                  totalMatches === 0 
                    ? `Nenhum resultado encontrado para "${searchQuery}"`
                    : `Encontrados ${totalMatches} versículos. Exibindo os primeiros ${searchResults.length}.`
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setHasSearched(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="p-1 px-3 rounded-full text-xs font-semibold text-[#94A3B8] hover:text-white bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1 cursor-pointer font-sans"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {searchResults.map((result, idx) => (
                <div
                  key={result.id || idx}
                  onClick={() => {
                    navigate('/bible', { state: { book: result.book_name, chapter: result.chapter }});
                  }}
                  className="bg-[#08090B] p-4 rounded-xl border border-white/5 hover:border-[#C5A059]/30 hover:bg-[#1C2026]/40 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider group-hover:text-[#D4AF68] transition-colors flex items-center gap-1 pb-1">
                      {result.book_name} {result.chapter}:{result.verse}
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -ml-1 group-hover:ml-0" />
                    </span>
                  </div>
                  <p className="text-[#E2E8F0] text-sm leading-relaxed font-serif">
                    {highlightResultText(result.text, searchQuery)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <div className="text-center py-8 text-[#94A3B8] font-sans">
              Nenhum versículo com o termo "<span className="text-[#E2E8F0] font-medium">{searchQuery}</span>" foi encontrado. Tente buscar sinônimos ou certifique-se da grafia completa.
            </div>
          )}
        </section>
      )}

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
      
      {readingHistory.length > 0 && (
        <section className="bg-[#1C2026] rounded-2xl p-6 md:p-8 border border-white/5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
              <History className="w-5 h-5 text-[#C5A059]" />
              Histórico de Leitura
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {readingHistory.map(entry => (
              <button 
                key={entry.id} 
                className="bg-[#08090B] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between group text-left"
                onClick={() => {
                  navigate('/bible', { state: { book: entry.book_name, chapter: entry.chapter }});
                }}
              >
                <div>
                  <span className="text-sm font-semibold text-[#E2E8F0] block mb-1">
                    {entry.book_name} {entry.chapter}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C5A059] opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {chaptersWithNotes.length > 0 && (
        <section className="bg-[#1C2026] rounded-2xl p-6 md:p-8 border border-white/5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#C5A059]" />
              Capítulos com Anotações
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {chaptersWithNotes.map((chapter, idx) => (
              <button 
                key={idx} 
                className="bg-[#08090B] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between group text-left"
                onClick={() => {
                  navigate('/bible', { state: { book: chapter.book_name, chapter: chapter.chapter }});
                }}
              >
                <div>
                  <span className="text-sm font-semibold text-[#E2E8F0] block mb-1">
                    {chapter.book_name} {chapter.chapter}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    Anotado em {new Date(chapter.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C5A059] opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
              </button>
            ))}
          </div>
        </section>
      )}

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
                    {note.book_name} {note.chapter}{note.verse === 0 ? "" : `:${note.verse}`}
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
