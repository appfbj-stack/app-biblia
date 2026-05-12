import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { useAudio } from "../contexts/AudioContext";
import { Play, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { cn } from "../lib/utils";

export default function Bible() {
  const [currentBook, setCurrentBook] = useState('Gênesis');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentBookMaxChapters, setCurrentBookMaxChapters] = useState(50);
  
  const books = useLiveQuery(() => db.books.toArray(), []);
  const audio = useAudio();

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

  const totalChapters = books?.reduce((acc, book) => acc + book.chapters, 0) || 1189;
  const readChaptersCount = useLiveQuery(() => db.read_chapters.count(), []) || 0;
  const progressPercent = Math.round((readChaptersCount / totalChapters) * 100);

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
        </div>
      </div>

      <div className="space-y-4 text-xl leading-[1.8] font-serif text-[#E2E8F0]">
        {verses ? verses.map((verse) => {
          const isActive = audio.currentBook === currentBook && audio.currentChapter === currentChapter && audio.currentVerse === verse.verse;
          const isRead = readVerses.some(v => v.verse === verse.verse);
          
          return (
            <p 
              key={verse.id} 
              onClick={() => toggleVerseRead(verse.verse)}
              className={cn(
                "group relative transition-all duration-300 cursor-pointer p-2 -mx-2 rounded-lg",
                isActive ? "bg-[#C5A059]/10 text-white" : "hover:bg-white/5",
                isRead && !isActive ? "text-[#94A3B8]" : ""
              )}
            >
              <sup className={cn(
                "text-xs font-sans mr-2 align-super",
                isActive || isRead ? "text-[#C5A059]" : "text-[#94A3B8]"
              )}>
                {verse.verse}
              </sup>
              <span>{verse.text}</span>
            </p>
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
    </div>
  );
}
