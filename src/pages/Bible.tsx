import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { safeLocalStorage } from "../lib/storage";
import { useAudio } from "../contexts/AudioContext";
import { Play, Pause, Volume2, ChevronDown, CheckCircle2, Circle, StickyNote, X, Save, Settings2, Type, AlignLeft, Share2, Search, Loader2, Book, Languages, Highlighter, GitMerge, Link2 } from "lucide-react";
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

const HIGHLIGHT_STYLES: Record<string, string> = {
  gold: "bg-[#C5A059]/15 border-l-2 border-[#C5A059] rounded-l-none",
  green: "bg-emerald-500/10 border-l-2 border-emerald-500 rounded-l-none",
  blue: "bg-blue-500/10 border-l-2 border-blue-500 rounded-l-none",
  red: "bg-red-500/10 border-l-2 border-red-500 rounded-l-none",
  purple: "bg-purple-500/10 border-l-2 border-purple-500 rounded-l-none",
};

const FALLBACK_BIBLE_BOOKS = [
  { id: 1, name: "Gênesis", chapters: 50 },
  { id: 2, name: "Êxodo", chapters: 40 },
  { id: 3, name: "Levítico", chapters: 27 },
  { id: 4, name: "Números", chapters: 36 },
  { id: 5, name: "Deuteronômio", chapters: 34 },
  { id: 6, name: "Josué", chapters: 24 },
  { id: 7, name: "Juízes", chapters: 21 },
  { id: 8, name: "Rute", chapters: 4 },
  { id: 9, name: "1 Samuel", chapters: 31 },
  { id: 10, name: "2 Samuel", chapters: 24 },
  { id: 11, name: "1 Reis", chapters: 22 },
  { id: 12, name: "2 Reis", chapters: 25 },
  { id: 13, name: "1 Crônicas", chapters: 29 },
  { id: 14, name: "2 Crônicas", chapters: 36 },
  { id: 15, name: "Esdras", chapters: 10 },
  { id: 16, name: "Neemias", chapters: 13 },
  { id: 17, name: "Ester", chapters: 10 },
  { id: 18, name: "Jó", chapters: 42 },
  { id: 19, name: "Salmos", chapters: 150 },
  { id: 20, name: "Provérbios", chapters: 31 },
  { id: 21, name: "Eclesiastes", chapters: 12 },
  { id: 22, name: "Cânticos", chapters: 8 },
  { id: 23, name: "Isaías", chapters: 66 },
  { id: 24, name: "Jeremias", chapters: 52 },
  { id: 25, name: "Lamentações", chapters: 5 },
  { id: 26, name: "Ezequiel", chapters: 48 },
  { id: 27, name: "Daniel", chapters: 12 },
  { id: 28, name: "Oséias", chapters: 14 },
  { id: 29, name: "Joel", chapters: 3 },
  { id: 30, name: "Amós", chapters: 9 },
  { id: 31, name: "Obadias", chapters: 1 },
  { id: 32, name: "Jonas", chapters: 4 },
  { id: 33, name: "Miquéias", chapters: 7 },
  { id: 34, name: "Naum", chapters: 3 },
  { id: 35, name: "Habacuque", chapters: 3 },
  { id: 36, name: "Sofonias", chapters: 3 },
  { id: 37, name: "Ageu", chapters: 2 },
  { id: 38, name: "Zacarias", chapters: 14 },
  { id: 39, name: "Malaquias", chapters: 4 },
  { id: 40, name: "Mateus", chapters: 28 },
  { id: 41, name: "Marcos", chapters: 16 },
  { id: 42, name: "Lucas", chapters: 24 },
  { id: 43, name: "João", chapters: 21 },
  { id: 44, name: "Atos", chapters: 28 },
  { id: 45, name: "Romanos", chapters: 16 },
  { id: 46, name: "1 Coríntios", chapters: 16 },
  { id: 47, name: "2 Coríntios", chapters: 13 },
  { id: 48, name: "Gálatas", chapters: 6 },
  { id: 49, name: "Efésios", chapters: 6 },
  { id: 50, name: "Filipenses", chapters: 4 },
  { id: 51, name: "Colossenses", chapters: 4 },
  { id: 52, name: "1 Tessalonicenses", chapters: 5 },
  { id: 53, name: "2 Tessalonicenses", chapters: 3 },
  { id: 54, name: "1 Timóteo", chapters: 6 },
  { id: 55, name: "2 Timóteo", chapters: 4 },
  { id: 56, name: "Tito", chapters: 3 },
  { id: 57, name: "Filemom", chapters: 1 },
  { id: 58, name: "Hebreus", chapters: 13 },
  { id: 59, name: "Tiago", chapters: 5 },
  { id: 60, name: "1 Pedro", chapters: 5 },
  { id: 61, name: "2 Pedro", chapters: 3 },
  { id: 62, name: "1 João", chapters: 5 },
  { id: 63, name: "2 João", chapters: 1 },
  { id: 64, name: "3 João", chapters: 1 },
  { id: 65, name: "Judas", chapters: 1 },
  { id: 66, name: "Apocalipse", chapters: 22 }
];

export default function Bible() {
  const location = useLocation();
  const [currentBook, setCurrentBook] = useState(location.state?.book || 'Gênesis');
  const [currentChapter, setCurrentChapter] = useState(location.state?.chapter || 1);
  const [currentBookMaxChapters, setCurrentBookMaxChapters] = useState(50);
  
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [fontSize, setFontSize] = useState(() => safeLocalStorage.getItem('bible-font-size') || 'text-xl');
  const [lineSpacing, setLineSpacing] = useState(() => safeLocalStorage.getItem('bible-line-spacing') || 'leading-[1.8]');
  const [showSettings, setShowSettings] = useState(false);

  // Cross References State
  const [chapterCrossRefs, setChapterCrossRefs] = useState<any[]>([]);
  const [selectedVerseCrossRefs, setSelectedVerseCrossRefs] = useState<any[]>([]);
  const [activeCrossRefVerse, setActiveCrossRefVerse] = useState<number | null>(null);
  const [isFetchingCrossRefs, setIsFetchingCrossRefs] = useState(false);
  const [crossRefsError, setCrossRefsError] = useState<string | null>(null);

  const fetchChapterCrossRefs = async (bookName: string, chap: number) => {
    setIsFetchingCrossRefs(true);
    setCrossRefsError(null);
    try {
      const response = await fetch("/api/cross-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: bookName, chapter: chap }),
      });
      if (!response.ok) {
        throw new Error("Não foi possível carregar as referências cruzadas.");
      }
      const data = await response.json();
      setChapterCrossRefs(data.references || []);
    } catch (e: any) {
      console.error("Error fetching chapter cross-references", e);
      setCrossRefsError("Erro de conexão ao carregar referências cruzadas.");
    } finally {
      setIsFetchingCrossRefs(false);
    }
  };

  const fetchVerseCrossRefs = async (verseNum: number) => {
    setIsFetchingCrossRefs(true);
    setCrossRefsError(null);
    setActiveCrossRefVerse(verseNum);
    setSelectedVerseCrossRefs([]);
    
    setTimeout(() => {
      const refsEl = document.getElementById("deep-study-cross-refs");
      if (refsEl) {
        refsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    try {
      const response = await fetch("/api/cross-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: currentBook, chapter: currentChapter, verse: verseNum }),
      });
      if (!response.ok) {
        throw new Error("Não foi possível carregar as referências.");
      }
      const data = await response.json();
      setSelectedVerseCrossRefs(data.references || []);
    } catch (e: any) {
      console.error("Error fetching verse cross-references", e);
      setCrossRefsError("Erro de conexão ao buscar referências deste versículo.");
    } finally {
      setIsFetchingCrossRefs(false);
    }
  };

  const parseReferenceAndNavigate = (refStr: string) => {
    const displayBooksWithFallback = books && books.length > 0 ? books : FALLBACK_BIBLE_BOOKS;
    const sortedBooks = [...displayBooksWithFallback].sort((a, b) => b.name.length - a.name.length);
    
    const cleanRef = refStr.trim();
    for (const b of sortedBooks) {
      if (cleanRef.toLowerCase().startsWith(b.name.toLowerCase())) {
        const remaining = cleanRef.substring(b.name.length).trim();
        const numMatch = remaining.match(/^(\d+)(?:\s*[:,\s]\s*(\d+))?/);
        if (numMatch) {
          const chapNum = parseInt(numMatch[1], 10);
          const verseNum = numMatch[2] ? parseInt(numMatch[2], 10) : null;
          
          setCurrentBook(b.name);
          setCurrentChapter(chapNum);
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          if (verseNum) {
            setTimeout(() => {
              const verseEl = document.getElementById(`verse-${verseNum}`);
              if (verseEl) {
                verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 500);
          }
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (currentBook && currentChapter) {
      fetchChapterCrossRefs(currentBook, currentChapter);
      setActiveCrossRefVerse(null);
      setSelectedVerseCrossRefs([]);
    }
  }, [currentBook, currentChapter]);

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
  const [showDictBanner, setShowDictBanner] = useState(() => safeLocalStorage.getItem('hide-dict-banner') !== 'true');

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

  // Original Verse translation & parsing state
  const [originalVerseInfo, setOriginalVerseInfo] = useState<{
    book: string;
    chapter: number;
    verse: number;
    original_language: string;
    original_text_unicode: string;
    original_text_transliterated: string;
    literal_translation_pt: string;
    analysis: Array<{
      term: string;
      transliteration: string;
      strong?: string;
      morfologia: string;
      meaning: string;
      explanation: string;
    }>;
    exegesis_summary: string;
  } | null>(null);
  const [isSearchingOriginal, setIsSearchingOriginal] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [showOriginalModal, setShowOriginalModal] = useState(false);

  const handleOpenOriginalLanguage = async (verseObj: any) => {
    setIsSearchingOriginal(true);
    setOriginalError(null);
    setOriginalVerseInfo({
      book: currentBook,
      chapter: currentChapter,
      verse: verseObj.verse,
      original_language: "",
      original_text_unicode: "",
      original_text_transliterated: "",
      literal_translation_pt: "",
      analysis: [],
      exegesis_summary: ""
    });
    setShowOriginalModal(true);

    try {
      const response = await fetch("/api/verse-original", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: verseObj.text,
          book: currentBook,
          chapter: currentChapter,
          verse: verseObj.verse,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar o texto original. Verifique os limites da API ou tente mais tarde.");
      }

      const data = await response.json();
      setOriginalVerseInfo(data);
    } catch (err: any) {
      console.error("Original language loading error:", err);
      setOriginalError(err.message || "Falha de conexão.");
    } finally {
      setIsSearchingOriginal(false);
    }
  };

  // Verse Highlighting State & Trigger
  const [activePaletteVerse, setActivePaletteVerse] = useState<number | null>(null);

  const handleHighlight = async (verseNum: number, color: string | null) => {
    try {
      const existing = await db.highlighted_verses
        .where('[book_name+chapter+verse]')
        .equals([currentBook, currentChapter, verseNum])
        .first();

      if (color === null) {
        if (existing && existing.id) {
          await db.highlighted_verses.delete(existing.id);
        }
      } else {
        if (existing && existing.id) {
          await db.highlighted_verses.update(existing.id, {
            color,
            created_at: new Date().toISOString()
          });
        } else {
          await db.highlighted_verses.add({
            book_name: currentBook,
            chapter: currentChapter,
            verse: verseNum,
            color,
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Error updating highlight:", err);
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      setActivePaletteVerse(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    try {
      safeLocalStorage.setItem('bible-font-size', fontSize);
    } catch (e) {
      console.warn("Failed to save font size to storage", e);
    }
  }, [fontSize]);

  useEffect(() => {
    try {
      safeLocalStorage.setItem('bible-line-spacing', lineSpacing);
    } catch (e) {
      console.warn("Failed to save line spacing to storage", e);
    }
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
  const displayBooks = (books && books.length > 0) ? books : FALLBACK_BIBLE_BOOKS;
  const audio = useAudio();

  useEffect(() => {
    if (displayBooks && displayBooks.length > 0) {
      const foundBook = displayBooks.find(b => b.name === currentBook);
      if (foundBook) {
        setCurrentBookMaxChapters(foundBook.chapters);
      }
    }
  }, [displayBooks, currentBook]);

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

  const highlightedVerses = useLiveQuery(
    () => db.highlighted_verses.where('[book_name+chapter]').equals([currentBook, currentChapter]).toArray(),
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
            {displayBooks?.map(book => (
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

      {showDictBanner && (
        <div className="bg-[#1D222B] border border-white/5 rounded-xl px-4 py-2.5 flex items-start sm:items-center justify-between gap-2 text-xs text-[#94A3B8] animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-2">
            <span className="text-[#C5A059] font-bold shrink-0">💡 Dicionário:</span>
            <span>Clique longo em qualquer palavra para ver a explicação teológica.</span>
          </div>
          <button 
            onClick={() => {
              setShowDictBanner(false);
              try {
                safeLocalStorage.setItem('hide-dict-banner', 'true');
              } catch (e) {
                console.warn("Failed to save hide banner flag to storage", e);
              }
            }} 
            className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer p-0.5 ml-2 shrink-0"
            title="Ocultar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className={`space-y-4 font-serif text-[#E2E8F0] transition-all duration-300 ${fontSize} ${lineSpacing}`}>
        {verses ? verses.map((verse) => {
          const isActive = audio.currentBook === currentBook && audio.currentChapter === currentChapter && audio.currentVerse === verse.verse;
          const isRead = readVerses.some(v => v.verse === verse.verse);
          const hasNote = chapterNotes.some(n => n.verse === verse.verse);
          const highlightObj = highlightedVerses.find(h => h.verse === verse.verse);
          const highlightClass = highlightObj ? HIGHLIGHT_STYLES[highlightObj.color] : "";
          
          return (
            <div 
              key={verse.id} 
              id={`verse-${verse.verse}`}
              className={cn(
                "group relative transition-all duration-300 p-2 -mx-2 rounded-lg flex gap-2 items-start",
                highlightClass,
                isActive ? (highlightClass ? "text-white" : "bg-[#C5A059]/10 text-white") : (!highlightClass && "hover:bg-white/5"),
                isRead && !isActive && !highlightClass ? "text-[#94A3B8]" : ""
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
                hasNote || isActive || highlightObj ? "opacity-100" : "opacity-75 sm:opacity-0 sm:group-hover:opacity-100"
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
                    handleOpenOriginalLanguage(verse);
                  }}
                  className="p-2 rounded-full transition-all text-[#94A3B8] hover:text-[#C5A059] hover:bg-white/10"
                  title="Traduzir no Original"
                >
                  <Languages className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchVerseCrossRefs(verse.verse);
                  }}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    activeCrossRefVerse === verse.verse
                      ? "text-[#C5A059] bg-[#C5A059]/10 !opacity-100 animate-pulse"
                      : "text-[#94A3B8] hover:text-[#C5A059] hover:bg-white/10"
                  )}
                  title="Ver Referências Cruzadas"
                >
                  <GitMerge className="w-4 h-4" />
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
                
                {/* Highlighting Button & Click-away Popover */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePaletteVerse(activePaletteVerse === verse.verse ? null : verse.verse);
                    }}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      highlightObj
                        ? "text-[#C5A059] bg-[#C5A059]/10 !opacity-100"
                        : "text-[#94A3B8] hover:text-[#C5A059] hover:bg-white/10"
                    )}
                    title={highlightObj ? "Mudar / Remover Destaque" : "Marcar / Destacar Versículo"}
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>

                  {activePaletteVerse === verse.verse && (
                    <div 
                      className="absolute right-0 bottom-full mb-2 z-30 bg-[#16191E] border border-white/10 rounded-xl p-2.5 shadow-2xl flex items-center gap-2 animate-in zoom-in-95 duration-100 min-w-[160px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          handleHighlight(verse.verse, 'gold');
                          setActivePaletteVerse(null);
                        }}
                        className="w-5 h-5 rounded-full bg-[#C5A059] border border-white/20 hover:scale-110 active:scale-95 transition-transform shrink-0"
                        title="Dourado"
                      />
                      <button
                        onClick={() => {
                          handleHighlight(verse.verse, 'green');
                          setActivePaletteVerse(null);
                        }}
                        className="w-5 h-5 rounded-full bg-emerald-500 border border-white/20 hover:scale-110 active:scale-95 transition-transform shrink-0"
                        title="Verde"
                      />
                      <button
                        onClick={() => {
                          handleHighlight(verse.verse, 'blue');
                          setActivePaletteVerse(null);
                        }}
                        className="w-5 h-5 rounded-full bg-blue-500 border border-white/20 hover:scale-110 active:scale-95 transition-transform shrink-0"
                        title="Azul"
                      />
                      <button
                        onClick={() => {
                          handleHighlight(verse.verse, 'red');
                          setActivePaletteVerse(null);
                        }}
                        className="w-5 h-5 rounded-full bg-red-500 border border-white/20 hover:scale-110 active:scale-95 transition-transform shrink-0"
                        title="Vermelho"
                      />
                      <button
                        onClick={() => {
                          handleHighlight(verse.verse, 'purple');
                          setActivePaletteVerse(null);
                        }}
                        className="w-5 h-5 rounded-full bg-purple-500 border border-white/20 hover:scale-110 active:scale-95 transition-transform shrink-0"
                        title="Roxo"
                      />
                      {highlightObj && (
                        <button
                          onClick={() => {
                            handleHighlight(verse.verse, null);
                            setActivePaletteVerse(null);
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-red-500/10 text-red-400 text-[10px] font-sans ml-1 transition-all uppercase font-bold tracking-wider shrink-0"
                          title="Remover Destaque"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Deep Study Cross References Section */}
      <div id="deep-study-cross-refs" className="mt-12 bg-[#1C2026] border border-white/5 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C5A059]/10 text-[#C5A059]">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-[#E2E8F0]">
                Estudo de Referências Cruzadas
              </h3>
              <p className="text-xs text-[#94A3B8]">
                {activeCrossRefVerse 
                  ? `Versículos correlacionados a ${currentBook} ${currentChapter}:${activeCrossRefVerse}` 
                  : `Versículos correlacionados ao capítulo de ${currentBook} ${currentChapter}`}
              </p>
            </div>
          </div>
          
          {activeCrossRefVerse && (
            <button
              onClick={() => {
                setActiveCrossRefVerse(null);
                setSelectedVerseCrossRefs([]);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
            >
              Exibir geral do capítulo
            </button>
          )}
        </div>

        {isFetchingCrossRefs ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
            <p className="text-xs text-[#94A3B8]">
              Consultando conexões teológicas do Hermes...
            </p>
          </div>
        ) : crossRefsError ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-red-500 font-medium">{crossRefsError}</p>
            <button
              onClick={() => activeCrossRefVerse ? fetchVerseCrossRefs(activeCrossRefVerse) : fetchChapterCrossRefs(currentBook, currentChapter)}
              className="text-xs font-bold px-4 py-2 bg-[#C5A059] text-white rounded-full hover:bg-[#D4AF68] transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(activeCrossRefVerse ? selectedVerseCrossRefs : chapterCrossRefs).length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {(activeCrossRefVerse ? selectedVerseCrossRefs : chapterCrossRefs).map((ref, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#16191E] border border-white/5 hover:border-[#C5A059]/30 rounded-xl p-4 transition-all hover:translate-x-1"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-sans text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded font-semibold">
                          Origem: Versículo {ref.source_verse_num}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] -rotate-90 pointer-events-none" />
                        <span className="text-sm font-serif font-bold text-white selection:bg-[#C5A059]/30">
                          {ref.target_reference}
                        </span>
                      </div>
                      <button
                        onClick={() => parseReferenceAndNavigate(ref.target_reference)}
                        className="text-xs font-sans text-[#91A5C1] hover:text-[#C5A059] flex items-center gap-1 transition-all"
                        title="Ir para este versículo"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Acessar
                      </button>
                    </div>
                    <p className="text-[#E2E8F0] text-sm italic font-serif leading-relaxed mb-3 pl-3 border-l-2 border-[#C5A059]/40 select-text selection:bg-[#C5A059]/30">
                      "{ref.target_text}"
                    </p>
                    <div className="bg-white/5 rounded-lg p-2.5 text-xs text-[#94A3B8] border border-white/5 font-sans">
                      <span className="font-semibold text-[#C5A059] block mb-1">Conexão Teológica:</span>
                      {ref.explanation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-[#94A3B8] italic">
                  Nenhuma referência encontrada para esta seleção no momento. Certifique-se de estar conectado à internet na primeira vez que abre o aplicativo para baixar referências.
                </p>
              </div>
            )}
          </div>
        )}
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
            className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#08090B]">
              <h3 className="font-serif font-semibold text-sm text-[#E2E8F0] flex items-center gap-2">
                <Book className="w-4 h-4 text-[#C5A059]" />
                Dicionário Teológico
              </h3>
              <button 
                onClick={() => setShowDictModal(false)}
                className="text-[#94A3B8] hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {isSearchingDict ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                  <p className="text-xs text-[#94A3B8] text-center font-sans max-w-xs">
                    Invocando as definições de Hermes para <span className="text-[#C5A059] font-medium font-serif">"{dictInfo.word}"</span>...
                  </p>
                </div>
              ) : dictError ? (
                <div className="text-center py-6 space-y-3">
                  <div className="text-red-400 font-sans text-xs font-semibold">
                    Ops! Problema ao obter a definição.
                  </div>
                  <p className="text-[10px] text-[#94A3B8] max-w-xs mx-auto">
                    {dictError}
                  </p>
                  <button
                    onClick={() => handleOpenDictionary(dictInfo.word, { text: "" })}
                    className="px-3 py-1.5 mt-2 bg-[#C5A059]/25 hover:bg-[#C5A059]/35 text-[#C5A059] text-[10px] font-bold rounded-full transition-colors font-sans mx-auto block"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Title and stats */}
                  <div className="border-b border-white/5 pb-3">
                    <h4 className="text-lg font-serif font-bold text-[#E2E8F0] tracking-tight capitalize">
                      {dictInfo.word}
                    </h4>
                    
                    <div className="flex flex-wrap gap-1 text-[10px] font-sans mt-1.5">
                      {dictInfo.language && (
                        <span className="px-1.5 py-0.5 rounded bg-[#C5A059]/15 text-[#C5A059] font-semibold">
                          {dictInfo.language}
                        </span>
                      )}
                      {dictInfo.original_term && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[#E2E8F0] font-serif font-bold">
                          {dictInfo.original_term}
                        </span>
                      )}
                      {dictInfo.transliteration && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8] italic">
                          {dictInfo.transliteration}
                        </span>
                      )}
                      {dictInfo.strong_number && (
                        <span className="px-1.5 py-0.5 rounded bg-[#C5A059]/10 text-[#C5A059]/80 font-mono">
                          {dictInfo.strong_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Theological definition */}
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] font-sans flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
                      Definição Teológica
                    </h5>
                    <p className="text-[#E2E8F0] text-xs leading-relaxed font-serif bg-[#08090B] p-3 rounded-xl border border-white/5">
                      {dictInfo.definition}
                    </p>
                  </div>

                  {/* Spiritual application */}
                  {dictInfo.application && (
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] font-sans flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
                        Aplicação Prática
                      </h5>
                      <p className="text-[#94A3B8] text-xs leading-relaxed italic bg-[#C5A059]/5 p-3 rounded-xl border border-[#C5A059]/10">
                        {dictInfo.application}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5 bg-[#08090B] flex justify-end">
              <button 
                onClick={() => setShowDictModal(false)}
                className="px-4 py-1.5 rounded-xl font-medium bg-[#C5A059] text-[#0F1115] hover:bg-[#D4AF68] transition-colors text-xs font-sans"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Original Language Analysis Modal */}
      {showOriginalModal && originalVerseInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowOriginalModal(false)}
        >
          <div 
            className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#08090B]">
              <h3 className="font-serif font-semibold text-[#E2E8F0] flex items-center gap-2">
                <Languages className="w-5 h-5 text-[#C5A059]" />
                Tradução e Análise no Original
              </h3>
              <button 
                onClick={() => setShowOriginalModal(false)}
                className="text-[#94A3B8] hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
              {isSearchingOriginal ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="w-10 h-10 text-[#C5A059] animate-spin" />
                  <p className="text-sm text-[#94A3B8] text-center font-sans max-w-xs">
                    Consultando as línguas originais e exegese de <span className="text-[#C5A059] font-medium font-serif">{originalVerseInfo.book} {originalVerseInfo.chapter}:{originalVerseInfo.verse}</span>...
                  </p>
                </div>
              ) : originalError ? (
                <div className="text-center py-12 space-y-4">
                  <div className="text-red-400 font-sans text-sm font-semibold">
                    Ops! Houve um erro ao buscar a análise no original.
                  </div>
                  <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                    {originalError}
                  </p>
                  <button
                    onClick={() => handleOpenOriginalLanguage({ verse: originalVerseInfo.verse, text: "" })}
                    className="px-4 py-2 mt-4 bg-[#C5A059]/25 hover:bg-[#C5A059]/35 text-[#C5A059] text-xs font-bold rounded-full transition-colors font-sans mx-auto block"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="space-y-6 font-sans">
                  {/* Title */}
                  <div className="border-b border-white/5 pb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A059]">
                      {originalVerseInfo.original_language || "Original"} completo
                    </span>
                    <h4 className="text-lg font-serif font-semibold text-[#E2E8F0] mt-1">
                      {originalVerseInfo.book} {originalVerseInfo.chapter}:{originalVerseInfo.verse}
                    </h4>
                  </div>

                  {/* Original script big card */}
                  <div className="bg-[#08090B] p-6 rounded-xl border border-white/5 text-center space-y-3">
                    <p className="text-3xl font-serif text-white leading-relaxed dir-rtl px-4 tracking-wide select-text selection:bg-[#C5A059]/30">
                      {originalVerseInfo.original_text_unicode}
                    </p>
                    {originalVerseInfo.original_text_transliterated && (
                      <p className="text-xs font-mono text-[#94A3B8] italic">
                        Pronúncia: {originalVerseInfo.original_text_transliterated}
                      </p>
                    )}
                  </div>

                  {/* Literal translation vs original contrast */}
                  {originalVerseInfo.literal_translation_pt && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        Tradução Exegética Literal
                      </h5>
                      <p className="text-[#E2E8F0] text-sm leading-relaxed font-serif bg-[#1E232C] p-4 rounded-xl border border-white/5">
                        "{originalVerseInfo.literal_translation_pt}"
                      </p>
                    </div>
                  )}

                  {/* Word by word breakdown grid */}
                  {originalVerseInfo.analysis && originalVerseInfo.analysis.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        Decomposição Interlinear e Termos-Chave
                      </h5>
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {originalVerseInfo.analysis.map((item, index) => (
                          <div key={index} className="bg-[#16191E] border border-white/5 hover:border-white/10 p-3 rounded-lg flex flex-col md:flex-row md:items-start gap-3 transition-colors text-xs">
                            <div className="md:w-1/4 shrink-0 flex flex-col gap-1">
                              <span className="text-lg font-serif text-white font-bold select-all">{item.term}</span>
                              <span className="text-[10px] font-sans font-medium text-[#C5A059] uppercase">{item.transliteration}</span>
                              {item.strong && (
                                <span className="text-[9px] font-mono text-[#94A3B8]/80">{item.strong}</span>
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center flex-wrap gap-2 text-[10px] text-[#94A3B8]">
                                <span className="font-semibold italic">{item.morfologia}</span>
                                <span className="text-[#C5A059] font-bold bg-[#C5A059]/10 px-1.5 py-0.5 rounded">{item.meaning}</span>
                              </div>
                              <p className="text-[#E2E8F0] text-xs leading-relaxed font-serif">{item.explanation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exegesis synthesis summary */}
                  {originalVerseInfo.exegesis_summary && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                        Estudo Exegético de Hermes
                      </h5>
                      <p className="text-[#94A3B8] text-xs leading-relaxed font-sans bg-white/5 p-4 rounded-xl border border-white/5">
                        {originalVerseInfo.exegesis_summary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-[#08090B] flex justify-end">
              <button 
                onClick={() => setShowOriginalModal(false)}
                className="px-6 py-2 rounded-xl font-medium bg-[#C5A059] text-[#0F1115] hover:bg-[#D4AF68] transition-colors text-sm font-sans"
              >
                Concluir Estudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
