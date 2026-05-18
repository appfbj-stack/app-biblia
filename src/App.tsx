/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Bible from './pages/Bible';
import Chat from './pages/Chat';
import { useEffect, useState } from 'react';
import { seedDatabase } from './database/seed';

import { AudioProvider } from './contexts/AudioContext';

export default function App() {
  const [seedingState, setSeedingState] = useState({ loading: false, message: '', error: '' });

  useEffect(() => {
    const handleSeedingStatus = (e: any) => {
      setSeedingState(e.detail);
    };

    window.addEventListener('seeding-status', handleSeedingStatus);
    
    seedDatabase().catch(console.error);

    return () => {
      window.removeEventListener('seeding-status', handleSeedingStatus);
    };
  }, []);

  const retrySeeding = () => {
    setSeedingState({ loading: true, message: 'Tentando novamente...', error: '' });
    seedDatabase().catch(console.error);
  };

  if (seedingState.error) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <p className="text-xl font-serif text-[#E2E8F0] mb-2">{seedingState.error}</p>
        <p className="text-sm text-[#94A3B8] mb-6">Você precisa estar conectado à internet na primeira vez que abre o aplicativo para baixar a Bíblia.</p>
        <button 
          onClick={retrySeeding}
          className="px-6 py-2 bg-[#C5A059] text-white rounded-full font-medium hover:bg-[#D4AF68] transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (seedingState.loading) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xl font-serif text-[#E2E8F0] mb-2">{seedingState.message}</p>
        <p className="text-sm text-[#94A3B8]">Isso deve levar apenas alguns instantes. A Bíblia ficará salva offline.</p>
      </div>
    );
  }

  return (
    <AudioProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bible" element={<Bible />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </Layout>
      </Router>
    </AudioProvider>
  );
}
