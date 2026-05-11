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
  const [seedingState, setSeedingState] = useState({ loading: false, message: '' });

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
