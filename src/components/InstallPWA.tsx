import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showHelpPrompt, setShowHelpPrompt] = useState(false);

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
    if (promptInstall) {
      promptInstall.prompt();
      promptInstall.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
          setSupportsPWA(false);
        } else {
          console.log("User dismissed the install prompt");
        }
      });
    } else {
      setShowHelpPrompt(true);
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      <button
        id="btn-install-pwa"
        className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059] text-white rounded-full text-xs font-medium hover:bg-[#D4AF68] transition-colors shadow-lg shrink-0"
        onClick={onClick}
      >
        <Download className="w-3.5 h-3.5" />
        Instalar App
      </button>

      {showHelpPrompt && (
        <div 
          id="pwa-install-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer" 
          onClick={() => setShowHelpPrompt(false)}
        >
          <div 
            className="bg-[#1C2026] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl mb-8 sm:mb-0 animate-in slide-in-from-bottom-8 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-semibold text-[#E2E8F0] mb-2 text-lg">
              {isIOS ? "Instalar no iOS" : "Instalar Aplicativo"}
            </h3>
            
            {isIOS ? (
              <>
                <p className="text-[#94A3B8] text-sm mb-4">
                  Para instalar o Hermes no seu iPhone ou iPad:
                </p>
                <ol className="text-[#94A3B8] text-sm space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-semibold">1</span>
                    <span className="pt-0.5">Toque no ícone de <strong>Compartilhar</strong> na barra do navegador Safari.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-semibold">2</span>
                    <span className="pt-0.5">Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-[#94A3B8] text-sm mb-4">
                  Siga estes passos rápidos para adicionar à sua tela inicial:
                </p>
                <ol className="text-[#94A3B8] text-sm space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-semibold">1</span>
                    <span className="pt-0.5">Abra o menu de configurações do navegador (ícone de <strong>três pontos</strong> ou <strong>menu vertical</strong>).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-semibold">2</span>
                    <span className="pt-0.5">Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                  </li>
                </ol>
              </>
            )}
            
            <button 
              id="pwa-close-btn"
              onClick={() => setShowHelpPrompt(false)}
              className="w-full py-3 rounded-xl font-medium bg-[#C5A059] text-white hover:bg-[#D4AF68] transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
