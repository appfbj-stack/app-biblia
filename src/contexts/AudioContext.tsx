import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../database/db';

type AudioContextType = {
  isPlaying: boolean;
  currentBook: string | null;
  currentChapter: number | null;
  currentVerse: number | null;
  playbackRate: number;
  playChapter: (book: string, chapter: number, startVerse?: number) => void;
  togglePlayPause: () => void;
  nextVerse: () => void;
  prevVerse: () => void;
  setSpeed: (speed: number) => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [versesCache, setVersesCache] = useState<any[]>([]);

  const synth = window.speechSynthesis;
  // Hold a reference to the active utterance so we can cancel it if needed
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadVerses = async (book: string, chapter: number) => {
    const v = await db.verses.where({ book_name: book, chapter }).toArray();
    setVersesCache(v);
    return v;
  };

  const speakVerse = useCallback((text: string, onEnd: () => void) => {
    if (synth.speaking) {
      synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackRate;
    utterance.lang = 'pt-BR'; // Portuguese text
    
    // Attempt to find a better Portuguese voice if available
    const voices = synth.getVoices();
    const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
    if (ptVoices.length > 0) {
      utterance.voice = ptVoices[0];
    }

    utterance.onend = () => {
      onEnd();
    };

    utterance.onerror = (e) => {
      console.error('Speech error', e);
      // If manually canceled, we handle it elsewhere
      if (e.error !== 'canceled') {
        setIsPlaying(false);
      }
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, [playbackRate, synth]);

  useEffect(() => {
    // Stop speaking when component unmounts
    return () => {
      if (synth.speaking) synth.cancel();
    };
  }, [synth]);

  // Handle continuous playback logic
  useEffect(() => {
    if (!isPlaying) {
      if (synth.speaking && !synth.paused) {
        synth.pause();
      }
      return;
    } else {
      if (synth.paused) {
        synth.resume();
        return;
      }
    }

    if (isPlaying && currentBook && currentChapter && currentVerse !== null && versesCache.length > 0) {
      const activeVerse = versesCache.find(v => v.verse === currentVerse);
      if (activeVerse) {
        speakVerse(activeVerse.text, async () => {
          // Proceed to next verse automatically
          const nextV = currentVerse + 1;
          const nextVerseData = versesCache.find(v => v.verse === nextV);
          
          if (nextVerseData) {
            setCurrentVerse(nextV);
          } else {
            // Reached end of chapter
            // Optionally, load next chapter here
            const bookInfo = await db.books.where({name: currentBook}).first();
            if (bookInfo && currentChapter < bookInfo.chapters) {
              const nextChap = currentChapter + 1;
              const nextChapVerses = await loadVerses(currentBook, nextChap);
              if (nextChapVerses.length > 0) {
                setCurrentChapter(nextChap);
                setCurrentVerse(1);
              } else {
                setIsPlaying(false); // Stop if no more verses loaded
              }
            } else {
              // End of book
              setIsPlaying(false);
            }
          }
        });
      }
    }
  }, [isPlaying, currentVerse, versesCache, currentBook, currentChapter, speakVerse, synth]);

  // When playback rate changes, update if currently playing
  useEffect(() => {
    if (isPlaying && synth.speaking) {
      // Modifying rate mid-speech might require canceling and re-speaking.
      // For simplicity, it will apply on the next verse.
    }
  }, [playbackRate, isPlaying, synth]);

  // Initial loading of voices
  useEffect(() => {
    synth.getVoices();
    synth.onvoiceschanged = () => synth.getVoices();
  }, [synth]);

  const playChapter = async (book: string, chapter: number, startVerse: number = 1) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    await loadVerses(book, chapter);
    setCurrentVerse(startVerse);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (!currentBook) return;
    setIsPlaying(!isPlaying);
  };

  const nextVerse = () => {
    if (versesCache.length === 0 || currentVerse === null) return;
    const nextV = currentVerse + 1;
    if (versesCache.some(v => v.verse === nextV)) {
      if (synth.speaking) synth.cancel();
      setCurrentVerse(nextV);
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const prevVerse = () => {
    if (versesCache.length === 0 || currentVerse === null) return;
    const prevV = currentVerse - 1;
    if (prevV >= 1) {
      if (synth.speaking) synth.cancel();
      setCurrentVerse(prevV);
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const setSpeed = (speed: number) => {
    setPlaybackRate(speed);
  };

  return (
    <AudioContext.Provider value={{
      isPlaying, currentBook, currentChapter, currentVerse, playbackRate,
      playChapter, togglePlayPause, nextVerse, prevVerse, setSpeed
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
