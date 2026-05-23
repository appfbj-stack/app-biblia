import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { useAudio } from "../contexts/AudioContext";
import { Play, Pause, Volume2, ChevronDown, CheckCircle2, Circle, StickyNote, X, Save, Settings2, Type, AlignLeft, Share2, Search, Loader2, Book } from "lucide-react";
import { cn } from "../lib/utils";

const highlightText = (text: string, search: string) => {
  if (!search.trim()) return <span>{text}</span>;
  
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-[#C5A059]/40 text-white rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface WordSelectableProps {
  word: string;
  onLongPress: (cleanWord: string) => void;
  isHighlighted: boolean;
}

const WordSelectable: React.FC<WordSelectableProps> = ({ word, onLongPress, isHighlighted }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const cleanWordValue = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "").trim();

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressActive.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (cleanWordValue) {
        onLongPress(cleanWordValue);
      }
    }, 550); // 550ms for press & hold
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isLongPressActive.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressActive.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
  };

  return (
    <span
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onClick={handleClick}
      className={cn(
        "inline-block rounded px-0.5 hover:bg-[#C5A059]/20 hover:text-white transition-all cursor-help select-none",
        isHighlighted && "bg-[#C5A059]/40 text-white font-bold"
      )}
    >
      {word}
    </span>
  );
};

interface InteractiveVerseTextProps {
  text: string;
  searchTerm: string;
  onLongPressWord: (word: string) => void;
}

const InteractiveVerseText: React.FC<InteractiveVerseTextProps> = ({ text, searchTerm, onLongPressWord }) => {
  if (!text) return null;
  const parts = text.split(/(\s+)/);

  return (
    <>
      {parts.map((part, index) => {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          return <span key={index}>{part}</span>;
        }

        const cleanPart = part.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "").trim().toLowerCase();
        const cleanSearch = searchTerm.trim().toLowerCase();
        const isHighlighted = cleanSearch ? cleanPart.includes(cleanSearch) : false;

        return (
          <WordSelectable
            key={index}
            word={part}
            onLongPress={onLongPressWord}
            isHighlighted={isHighlighted}
          />
        );
      })}
    </>
  );
};

export default function Bible() {
  const location = useLocation();
  const [currentBook, setCurrentBook] = useState(location.state?.book || 'Gênesis');
  const [currentChapter, setCurrentChapter] = useState(location.state?.chapter || 1);
  const [currentBookMaxChapters, setCurrentBookMaxChapters] = useState(50);
  
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('bible-font-size') || 'text-xl');
  const [lineSpacing, setLineSpacing] = useState(() => localStorage.getItem('bible-line-spacing') || 'leading-[1.8]');
  const [showSettings, setShowSettings] = useState(false);

  // Theological Dictionary State
  const [dictInfo, setDictInfo] = useState<{
    word: string;
    language?: string;
    transliteration?: string;
    original_term?: string;
    strong_number?: string;
    definition?: string;
    application?: string;
  } | null>(null);
  const [isSearchingDict, setIsSearchingDict] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const [showDictModal, setShowDictModal] = useState(false);

  const handleOpenDictionary = async (word: string, verseObj: any) => {
    setIsSearchingDict(true);
    setDictError(null);
    setDictInfo({ word });
    setShowDictModal(true);

    try {
      const response = await fetch("/api/dictionary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word,
          verseText: verseObj.text,
          book: currentBook,
          chapter: currentChapter,
          verse: verseObj.verse,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar a definição teológica. Verifique os limites da API ou tente mais tarde.");
      }

      const data = await response.json();
      setDictInfo(data);
    } catch (err: any) {
      console.error("Dictionary error:", err);
      setDictError(err.message || "Falha de conexão.");
    } finally {
      setIsSearchingDict(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('bible-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('bible-line-spacing', lineSpacing);
  }, [lineSpacing]);

  useEffect(() => {
    if (currentBook && currentChapter) {
      const updateReadingHistory = async () => {
        try {
          const existing = await db.reading_history.where('[book_name+chapter]').equals([currentBook, currentChapter]).first();
          if (existing && existing.id) {
            await db.reading_history.update(existing.id, { timestamp: Date.now() });
          } else {
            await db.reading_history.add({ book_name: currentBook, chapter: currentChapter, timestamp: Date.now() });
          }
        } catch (e) {
          console.error("Failed to update reading history", e);
        }
      };
      updateReadingHistory();
    }
  }, [currentBook, currentChapter]);

  useEffect(() => {
    setSearchTerm('');
  }, [currentBook, currentChapter]);
  
  const books = useLiveQuery(() => db.books.toArray(), []);
  const audio = useAudio();

  useEffect(() => {
    if (books && books.length > 0) {
      const foundBook = books.find(b => b.name === currentBook);
      if (foundBook) {
        setCurrentBookMaxChapters(foundBook.chapters);
      }
    }
  }, [books, currentBook]);

  const verses = useLiveQuery(
    () => db.verses.where({ book_name: currentBook, chapter: currentChapter }).toArray(),
    [currentBook, currentChapter]
  );

  const readVerses = useLiveQuery(
    () => db.read_verses.where({ book_name: currentBook, chapter: currentChapter }).toArray(),
    [currentBook, currentChapter]
  ) || [];

  const readChapter = useLiveQuery(
    () => db.read_chapters.where({ book_name: currentBook, chapter: currentChapter }).first(),
    [currentBook, currentChapter]
  );

  const chapterNotes = useLiveQuery(
    () => db.notes.where('[book_name+chapter]').equals([currentBook, currentChapter]).toArray(),
    [currentBook, currentChapter]
  ) || [];

  const totalChapters = books?.reduce((acc, book) => acc + book.chapters, 0) || 1189;
  const readChaptersCount = useLiveQuery(() => db.read_chapters.count(), []) || 0;
  const progressPercent = Math.round((readChaptersCount / totalChapters) * 100);

  const getSearchMatchesCount = () => {
    if (!searchTerm.trim() || !verses) return 0;
    const term = searchTerm.toLowerCase();
    return verses.filter(v => v.text.toLowerCase().includes(term)).length;
  };

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bookName = e.target.value;
    const foundBook = books?.find(b => b.name === bookName);
    setCurrentBook(bookName);
    setCurrentChapter(1);
    setCurrentBookMaxChapters(foundBook?.chapters || 1);
  };

  const handlePlayChapter = () => {
    if (verses && verses.length > 0) {
      audio.playChapter(currentBook, currentChapter, 1);
    }
  };

  const toggleChapterRead = async () => {
    if (readChapter) {
      await db.read_chapters.delete(readChapter.id!);
      await db.read_verses.where({ book_name: currentBook, chapter: currentChapter }).delete();
    } else {
      await db.read_chapters.add({ book_name: currentBook, chapter: currentChapter });
      if (verses) {
        // first clear existing verses for this chapter to avoid duplicates
        await db.read_verses.where({ book_name: currentBook, chapter: currentChapter }).delete();
        const toAdd = verses.map(v => ({ book_name: currentBook, chapter: currentChapter, verse: v.verse }));
        await db.read_verses.bulkAdd(toAdd);
      }
    }
  };

  const toggleVerseRead = async (verse: number) => {
    const existing = readVerses.find(v => v.verse === verse);
    if (existing) {
      await db.read_verses.delete(existing.id!);
      if (readChapter) {
        await db.read_chapters.delete(readChapter.id!);
      }
    } else {
      await db.read_verses.add({ book_name: currentBook, chapter: currentChapter, verse });
      if (verses && readVerses.length + 1 >= verses.length) {
        await db.read_chapters.add({ book_name: currentBook, chapter: currentChapter });
      }
    }
  };

  const openNote = (verse: number) => {
    const note = chapterNotes.find(n => n.verse === verse);
    setNoteContent(note?.content || '');
    setEditingNoteVerse(verse);
  };

  const shareVerse = async (verseText: string, verseNum: number) => {
    try {
      const shareData = {
        title: 'Hermes Bible',
        text: `"${verseText}" - ${currentBook} ${currentChapter}:${verseNum}`,
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        alert('Versículo copiado para a área de transferência!');
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  const shareChapter = async () => {
    try {
      const title = `${currentBook} ${currentChapter}`;
      const text = `Estou lendo ${title} no Hermes Bible.`;
      const shareData = { title, text };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        alert('Capítulo copiado para a área de transferência!');
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  const saveNote = async () => {
    if (editingNoteVerse === null) return;
    const note = chapterNotes.find(n => n.verse === editingNoteVerse);
    if (!noteContent.trim()) {
      if (note && note.id) await db.notes.delete(note.id);
    } else {
      if (note && note.id) {
        await db.notes.update(note.id, { content: noteContent.trim(), updated_at: new Date().toISOString() });
      } else {
        await db.notes.add({
          book_name: currentBook,
          chapter: currentChapter,
          verse: editingNoteVerse,
          content: noteContent.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: editingNoteVerse === 0 ? `Anotação - ${currentBook} ${currentChapter}` : `Anotação - ${currentBook} ${currentChapter}:${editingNoteVerse}`
        });
      }
    }
    setEditingNoteVerse(null);
    setNoteContent('');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-500 pb-24">
      <div className="mb-8 w-full bg-[#1C2026] rounded-xl p-4 border border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-[#94A3B8] font-medium mb-1">Seu Progresso</span>
          <span className="text-sm text-[#E2E8F0] font-medium">{readChaptersCount} de {totalChapters} Capítulos Lidos</span>
        </div>
        <div className="w-1/3 max-w-[120px]">
          <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#0F1115] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#C5A059] rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#94A3B8]" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar no capítulo atual..."
          className="w-full bg-[#1C2026] border border-white/5 focus:border-[#C5A059]/40 rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#C5A059]/30 transition-all font-sans"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-3 flex items-center text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {searchTerm && (
          <div className="mt-1.5 flex justify-between items-center px-1 text-xs text-[#94A3B8]">
            <span>
              {getSearchMatchesCount() === 1 
                ? "1 versículo encontrado" 
                : `${getSearchMatchesCount()} versículos encontrados`}
            </span>
            {getSearchMatchesCount() > 0 && (
              <span className="text-[#C5A059]/80 font-medium">Resultados destacados abaixo</span>
            )}
          </div>
        )}
      </div>

      <div className="text-center mb-10 border-b border-white/5 pb-8 flex flex-col items-center">
        <div className="relative inline-flex items-center group mb-2">
          <select 
            value={currentBook}
            onChange={handleBookChange}
            className="bg-transparent text-3xl font-serif font-semibold text-[#C5A059] focus:outline-none appearance-none text-center cursor-pointer group-hover:opacity-80 transition-opacity pr-8 relative z-10"
          >
            {books?.map(book => (
              <option key={book.id} value={book.name} className="bg-[#1C2026] text-base">{book.name}</option>
            ))}
          </select>
          <ChevronDown className="w-6 h-6 text-[#C5A059] absolute right-0 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
        <div className="flex items-center gap-4">
          <button 
            disabled={currentChapter <= 1}
            onClick={() => setCurrentChapter(c => c - 1)}
            className="text-[#94A3B8] hover:text-[#C5A059] disabled:opacity-30 p-1"
          >
            &larr;
          </button>
          <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-widest min-w-[100px]">
            Capítulo {currentChapter} / {currentBookMaxChapters}
          </p>
          <button 
            disabled={currentChapter >= currentBookMaxChapters}
            onClick={() => setCurrentChapter(c => c + 1)}
            className="text-[#94A3B8] hover:text-[#C5A059] disabled:opacity-30 p-1"
          >
            &rarr;
          </button>
        </div>
        
        <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
          <button 
            onClick={handlePlayChapter}
            disabled={!verses || verses.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-[#C5A059] transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> Escutar Capítulo
          </button>
          
          <button 
            onClick={toggleChapterRead}
            disabled={!verses || verses.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border rounded-full text-sm transition-all disabled:opacity-50",
              readChapter 
                ? "bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]" 
                : "bg-transparent border-white/10 hover:border-white/20 text-[#94A3B8] hover:text-[#E2E8F0]"
            )}
          >
            {readChapter ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            {readChapter ? "Capítulo Lido" : "Marcar como Lido"}
          </button>

          <button 
            onClick={shareChapter}
            disabled={!verses || verses.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-all disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>

          <button 
            onClick={() => openNote(0)}
            disabled={!verses || verses.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-transparent border rounded-full text-sm transition-all disabled:opacity-50",
              chapterNotes.some(n => n.verse === 0)
                ? "bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]" 
                : "border-white/10 hover:border-white/20 hover:bg-white/5 text-[#94A3B8] hover:text-[#E2E8F0]"
            )}
          >
            <StickyNote className="w-4 h-4" /> 
            {chapterNotes.some(n => n.verse === 0) ? "Editar Anotação" : "Anotar Capítulo"}
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-full text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-all"
          >
            <Settings2 className="w-4 h-4" /> Ajustar Leitura
          </button>
        </div>
      </div>

      <div className="bg-[#1D222B] border border-white/5 rounded-xl px-4 py-3 flex items-start sm:items-center gap-2 text-xs md:text-sm text-[#94A3B8] animate-in fade-in duration-300">
        <span className="text-[#C5A059] font-bold shrink-0">💡 Dicionário Teológico:</span>
        <span>Toque e segure (clique longo) em qualquer termo para revelar a definição, o significado em grego ou hebraico e aplicações teológicas.</span>
      </div>

      <div className={`space-y-4 font-serif text-[#E2E8F0] transition-all duration-300 ${fontSize} ${lineSpacing}`}>
        {verses ? verses.map((verse) => {
          const isActive = audio.currentBook === currentBook && audio.currentChapter === currentChapter && audio.currentVerse === verse.verse;
          const isRead = readVerses.some(v => v.verse === verse.verse);
          const hasNote = chapterNotes.some(n => n.verse === verse.verse);
          
          return (
            <div 
              key={verse.id} 
              className={cn(
                "group relative transition-all duration-300 p-2 -mx-2 rounded-lg flex gap-2 items-start",
                isActive ? "bg-[#C5A059]/10 text-white" : "hover:bg-white/5",
                isRead && !isActive ? "text-[#94A3B8]" : ""
              )}
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => toggleVerseRead(verse.verse)}
              >
                <sup className={cn(
                  "text-xs font-sans mr-2 align-super select-none shrink-0",
                  isActive || isRead ? "text-[#C5A059]" : "text-[#94A3B8]"
                )}>
                  {verse.verse}
                </sup>
                <InteractiveVerseText 
                  text={verse.text} 
                  searchTerm={searchTerm} 
                  onLongPressWord={(word) => handleOpenDictionary(word, verse)} 
                />
              </div>
              
              <div className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 shrink-0 mt-1 transition-opacity",
                hasNote || isActive ? "opacity-100" : "opacity-75 sm:opacity-0 sm:group-hover:opacity-100"
              )}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive && audio.isPlaying) {
                      audio.togglePlayPause();
                    } else {
                      audio.playChapter(currentBook, currentChapter, verse.verse);
                    }
                  }}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isActive && audio.isPlaying
                      ? "text-[#C5A059] bg-[#C5A059]/10 !opacity-100 animate-pulse"
                      : "text-[#94A3B8] hover:text-[#C5A059] hover:bg-white/10"
                  )}
                  title={isActive && audio.isPlaying ? "Pausar leitura" : "Ouvir versículo"}
                >
                  {isActive && audio.isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    shareVerse(verse.text, verse.verse);
                  }}
                  className="p-2 rounded-full transition-all text-[#94A3B8] hover:text-[#C5A059] hover:bg-white/10"
                  title="Compartilhar Versículo"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNote(verse.verse);
                  }}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    hasNote 
                      ? "text-[#C5A059] bg-[#C5A059]/10 !opacity-100" 
                      : "text-[#94A3B8] hover:bg-white/10"
                  )}
                  title={hasNote ? "Editar Anotação" : "Adicionar Anotação"}
                >
                  <StickyNote className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        }) : (
          <p className="text-center text-[#94A3B8]">Carregando as escrituras...</p>
        )}
        
        {verses?.length === 0 && (
          <p className="text-center text-[#94A3B8] italic">Este capítulo ainda não está disponível offline.</p>
        )}
      </div>

      <div className="mt-12 flex justify-between items-center pt-8 border-t border-white/5">
        <button 
          disabled={currentChapter <= 1}
          onClick={() => setCurrentChapter(c => c - 1)}
          className="text-sm font-medium text-[#94A3B8] hover:text-[#C5A059] disabled:opacity-30 transition-colors"
        >
          &larr; Capítulo Anterior
        </button>
        <button 
          disabled={currentChapter >= currentBookMaxChapters}
          onClick={() => setCurrentChapter(c => c + 1)}
          className="text-sm font-medium text-[#94A3B8] hover:text-[#C5A059] disabled:opacity-30 transition-colors"
        >
          Próximo Capítulo &rarr;
        </button>
      </div>

      {/* Note Editor Overlay */}
      {editingNoteVerse !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#08090B]">
              <h3 className="font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#C5A059]" />
                {editingNoteVerse === 0 ? `Anotação: ${currentBook} ${currentChapter}` : `Anotação: ${currentBook} ${currentChapter}:${editingNoteVerse}`}
              </h3>
              <button 
                onClick={() => setEditingNoteVerse(null)}
                className="text-[#94A3B8] hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={editingNoteVerse === 0 ? "Escreva suas reflexões sobre este capítulo..." : "Escreva suas reflexões sobre este versículo..."}
                className="w-full h-48 bg-transparent text-[#E2E8F0] px-0 py-2 border-none focus:outline-none focus:ring-0 resize-none font-sans"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-[#08090B]/50">
              <button 
                onClick={() => setEditingNoteVerse(null)}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveNote}
                className="flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium bg-[#C5A059] text-white hover:bg-[#D4AF68] transition-colors"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reading Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setShowSettings(false)}
        >
          <div className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#08090B]">
              <h3 className="font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#C5A059]" />
                Configurações de Leitura
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-[#94A3B8] hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-8 bg-[#1C2026]">
              {/* Font Size */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <Type className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-widest">Tamanho da Fonte</span>
                </div>
                <div className="flex bg-[#08090B] p-1 rounded-xl border border-white/5">
                  {[
                    { label: 'P', value: 'text-lg' },
                    { label: 'M', value: 'text-xl' },
                    { label: 'G', value: 'text-2xl' },
                    { label: 'GG', value: 'text-3xl' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFontSize(option.value)}
                      className={cn(
                        "flex-1 py-2 text-center rounded-lg text-sm font-medium transition-colors",
                        fontSize === option.value 
                          ? "bg-[#C5A059] text-white shadow-md relative z-10" 
                          : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Spacing */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <AlignLeft className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-widest">Espaçamento</span>
                </div>
                <div className="flex bg-[#08090B] p-1 rounded-xl border border-white/5">
                  {[
                    { label: 'Justo', value: 'leading-normal' },
                    { label: 'Normal', value: 'leading-[1.8]' },
                    { label: 'Largo', value: 'leading-loose' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setLineSpacing(option.value)}
                      className={cn(
                        "flex-1 py-2 text-center rounded-lg text-sm font-medium transition-colors",
                        lineSpacing === option.value 
                          ? "bg-[#C5A059] text-white shadow-md relative z-10" 
                          : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 bg-[#08090B]">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-3 rounded-xl font-medium bg-[#C5A059] text-white hover:bg-[#D4AF68] transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theological Dictionary Modal */}
      {showDictModal && dictInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowDictModal(false)}
        >
          <div 
            className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#08090B]">
              <h3 className="font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
                <Book className="w-5 h-5 text-[#C5A059]" />
                Dicionário Teológico
              </h3>
              <button 
                onClick={() => setShowDictModal(false)}
                className="text-[#94A3B8] hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {isSearchingDict ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-10 h-10 text-[#C5A059] animate-spin" />
                  <p className="text-sm text-[#94A3B8] text-center font-sans max-w-xs">
                    Invocando as definições de Hermes para a palavra <span className="text-[#C5A059] font-medium font-serif">"{dictInfo.word}"</span>...
                  </p>
                </div>
              ) : dictError ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-red-400 font-sans text-sm font-semibold">
                    Ops! Problema ao contatar Hermes.
                  </div>
                  <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                    {dictError}
                  </p>
                  <button
                    onClick={() => handleOpenDictionary(dictInfo.word, { text: "" })}
                    className="px-4 py-2 mt-4 bg-[#C5A059]/25 hover:bg-[#C5A059]/35 text-[#C5A059] text-xs font-bold rounded-full transition-colors font-sans mx-auto block"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Title and stats */}
                  <div className="border-b border-white/5 pb-4">
                    <h4 className="text-2xl font-serif font-bold text-[#E2E8F0] tracking-tight capitalize mb-2">
                      {dictInfo.word}
                    </h4>
                    
                    <div className="flex flex-wrap gap-2 text-xs font-sans mt-2">
                      {dictInfo.language && (
                        <span className="px-2.5 py-1 rounded bg-[#C5A059]/15 text-[#C5A059] font-semibold">
                          {dictInfo.language}
                        </span>
                      )}
                      {dictInfo.original_term && (
                        <span className="px-2.5 py-1 rounded bg-white/5 text-[#E2E8F0] font-serif font-bold">
                          {dictInfo.original_term}
                        </span>
                      )}
                      {dictInfo.transliteration && (
                        <span className="px-2.5 py-1 rounded bg-white/5 text-[#94A3B8] italic">
                          Transliteração: {dictInfo.transliteration}
                        </span>
                      )}
                      {dictInfo.strong_number && (
                        <span className="px-2.5 py-1 rounded bg-[#C5A059]/10 text-[#C5A059]/80 font-mono">
                          Strong: {dictInfo.strong_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Theological definition */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] font-sans flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      Definição Teológica
                    </h5>
                    <p className="text-[#E2E8F0] text-sm leading-relaxed font-serif bg-[#08090B] p-4 rounded-xl border border-white/5">
                      {dictInfo.definition}
                    </p>
                  </div>

                  {/* Spiritual application */}
                  {dictInfo.application && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] font-sans flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        Aplicação Prática e Vida Cristã
                      </h5>
                      <p className="text-[#92A3B8] text-sm leading-relaxed italic bg-[#C5A059]/5 p-4 rounded-xl border border-[#C5A059]/10">
                        {dictInfo.application}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-[#08090B] flex justify-end">
              <button 
                onClick={() => setShowDictModal(false)}
                className="px-6 py-2 rounded-xl font-medium bg-[#C5A059] text-[#0F1115] hover:bg-[#D4AF68] transition-colors text-sm font-sans"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
