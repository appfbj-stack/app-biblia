/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Bible from './pages/Bible';
import Chat from './pages/Chat';
import Sermons from './pages/Sermons';
import { useEffect, useState } from 'react';
import { seedDatabase } from './database/seed';

import { AudioProvider } from './contexts/AudioContext';

// Import Capacitor for native mobile UX
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

export default function App() {
  const [seedingState, setSeedingState] = useState({ loading: false, message: '', error: '' });

  useEffect(() => {
    // 1. Initialize Capacitor native enhancements if running inside Android/iOS
    if (Capacitor.isNativePlatform()) {
      // Style Status Bar to match elegant dark theme
      StatusBar.setStyle({ style: Style.Dark }).catch(console.error);
      StatusBar.setBackgroundColor({ color: '#08090B' }).catch(console.error);

      // Handle Android back button navigation
      const backListener = CapApp.addListener('backButton', () => {
        // If web history can go back, navigate back
        if (window.history.length > 1) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });

      // Hide Splash screen once React app starts up fully
      SplashScreen.hide().catch(console.error);

      return () => {
        backListener.then(l => l.remove()).catch(console.error);
      };
    }
  }, []);

  useEffect(() => {
    const handleSeedingStatus = (e: any) => {
      setSeedingState(e.detail);
    };

    window.addEventListener('seeding-status', handleSeedingStatus);
    
    seedDatabase().catch(console.error);

    // Auto-generate PNG icons from SVG for full mobile PWA installability helper
    const generatePWAIcons = async () => {
      try {
        const svgImage = new Image();
        svgImage.onload = async () => {
          try {
            // 192x192 PNG
            const canvas192 = document.createElement("canvas");
            canvas192.width = 192;
            canvas192.height = 192;
            const ctx192 = canvas192.getContext("2d");
            if (ctx192) {
              ctx192.fillStyle = "#08090B";
              ctx192.fillRect(0, 0, 192, 192);
              ctx192.drawImage(svgImage, 0, 0, 192, 192);
            }
            const data192 = canvas192.toDataURL("image/png");

            // 512x512 PNG
            const canvas512 = document.createElement("canvas");
            canvas512.width = 512;
            canvas512.height = 512;
            const ctx512 = canvas512.getContext("2d");
            if (ctx512) {
              ctx512.fillStyle = "#08090B";
              ctx512.fillRect(0, 0, 512, 512);
              ctx512.drawImage(svgImage, 0, 0, 512, 512);
            }
            const data512 = canvas512.toDataURL("image/png");

            // Save PNG files to server /public/
            await fetch("/api/save-pwa-icons", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                icon192: data192,
                icon512: data512,
              }),
            });
          } catch (innerErr) {
            console.error("Error drawing or saving generated PNG icons:", innerErr);
          }
        };
        svgImage.onerror = (e) => {
          console.error("Failed to load /icon.svg for PNG generation", e);
        };
        svgImage.src = "/icon.svg";
      } catch (err) {
        console.error("Failed to generate PWA PNG icons:", err);
      }
    };

    generatePWAIcons();

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
            <Route path="/sermons" element={<Sermons />} />
          </Routes>
        </Layout>
      </Router>
    </AudioProvider>
  );
}
