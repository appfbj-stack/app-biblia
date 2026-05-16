import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
        setSupportsPWA(false);
      } else {
        console.log("User dismissed the install prompt");
      }
    });
  };

  if (isStandalone) {
    return null;
  }

  // Only show button if we have a prompt or it's iOS
  if (!supportsPWA && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059] text-white rounded-full text-xs font-medium hover:bg-[#D4AF68] transition-colors shadow-lg"
        onClick={onClick}
      >
        <Download className="w-3.5 h-3.5" />
        Instalar App
      </button>

      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer" onClick={() => setShowIOSPrompt(false)}>
          <div className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl mb-8 animate-in slide-in-from-bottom-8 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif font-semibold text-[#E2E8F0] mb-2 text-lg">Instalar no iOS</h3>
            <p className="text-[#94A3B8] text-sm mb-4">
              Para instalar o Hermes no seu iPhone ou iPad:
            </p>
            <ol className="text-[#94A3B8] text-sm space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</span>
                Toque no ícone de Compartilhar na barra do navegador.
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</span>
                Role para baixo e toque em "Adicionar à Tela de Início".
              </li>
            </ol>
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
