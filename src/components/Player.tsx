import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { cn } from '../lib/utils';

export default function Player() {
  const { 
    isPlaying, currentBook, currentChapter, currentVerse, playbackRate,
    togglePlayPause, nextVerse, prevVerse, setSpeed 
  } = useAudio();

  if (!currentBook) return null;

  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <footer className="h-[100px] bg-[#08090B] border-t border-white/10 flex items-center px-4 md:px-8 gap-4 md:gap-10 shrink-0 relative z-50">
      <div className="flex flex-col w-[120px] md:w-[200px] shrink-0">
        <div className="font-semibold text-sm text-[#E2E8F0] truncate">
          {currentBook} {currentChapter}:{currentVerse}
        </div>
        <div className="text-xs text-[#94A3B8] truncate">Narração: Voz Padrão</div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <button 
            onClick={prevVerse}
            className="text-[#94A3B8] hover:text-[#C5A059] transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="w-11 h-11 bg-[#E2E8F0] text-[#0F1115] hover:bg-[#C5A059] rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 ml-1" fill="currentColor" />
            )}
          </button>

          <button 
            onClick={nextVerse}
            className="text-[#94A3B8] hover:text-[#C5A059] transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
        
        <div className="hidden md:flex items-center w-full max-w-[480px] gap-3">
          <span className="text-[10px] text-[#94A3B8]">Versículo</span>
          <div className="w-full h-1 bg-[#333] rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-[#C5A059] w-full rounded-full animate-pulse opacity-50"></div>
          </div>
          <span className="text-[10px] text-[#94A3B8]">Lendo...</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-4 shrink-0">
        <div className="flex gap-3 text-xs text-[#94A3B8]">
          {speeds.map(speed => (
            <button 
              key={speed}
              onClick={() => setSpeed(speed)}
              className={cn(
                "transition-colors",
                playbackRate === speed ? "text-[#C5A059] font-bold" : "hover:text-[#E2E8F0]"
              )}
            >
              {speed.toFixed(1)}x
            </button>
          ))}
        </div>
        <div className="text-[#94A3B8] ml-2">
          <Volume2 className="w-5 h-5" />
        </div>
      </div>
    </footer>
  );
}
