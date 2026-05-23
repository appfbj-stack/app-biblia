import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import Player from './Player';
import { InstallPWA } from './InstallPWA';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  });

  const navItems = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: BookOpen, label: 'Bíblia', path: '/bible' },
    { icon: MessageSquare, label: 'Hermes IA', path: '/chat' },
  ];

  return (
    <div className="flex h-screen bg-[#0F1115] text-[#E2E8F0] font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-[80px] bg-[#16191E] border-r border-white/5 items-center py-6">
        <div className="font-black text-[#C5A059] text-2xl mb-10">
          H
        </div>
        <nav className="flex-1 flex flex-col gap-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={cn(
                   "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                  isActive 
                    ? "bg-[#C5A059]/15 text-[#C5A059]" 
                    : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/5"
                )}
              >
                <item.icon className="w-6 h-6" />
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0F1115]">
        {/* Banner de aviso para Iframe (AI Studio Preview) */}
        {isIframe && (
          <div className="bg-[#C5A059]/10 border-b border-[#C5A059]/20 px-4 py-2 text-center text-xs md:text-sm text-[#E2E8F0] font-sans flex items-center justify-center gap-2 shrink-0 select-none animate-in fade-in duration-300">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C5A059]"></span>
            </span>
            <span className="text-[#94A3B8]">Para ouvir áudio e instalar direto no celular:</span>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline font-bold text-[#C5A059] hover:text-[#D4AF68] transition-colors"
            >
              Abra em Nova Aba ↗
            </a>
          </div>
        )}

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#16191E] border-b border-white/5 text-[#E2E8F0]">
          <h1 className="text-lg font-bold text-[#C5A059]">Hermes</h1>
          <div className="flex items-center gap-2">
            <InstallPWA />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto flex flex-col relative w-full h-full">
          {children}
        </main>

        <Player />

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden bg-[#08090B] border-t border-white/10 flex justify-around p-3 pb-safe">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1",
                location.pathname === item.path ? "text-[#C5A059]" : "text-[#94A3B8]"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
