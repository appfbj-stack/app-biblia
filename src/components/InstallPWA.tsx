import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Monitor, X, Sparkles, Check, Info } from 'lucide-react';

export function getOSName() {
  if (typeof window === 'undefined') return 'Dispositivo';
  const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
  
  if (/android/i.test(userAgent)) {
    return 'Android';
  }
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'iOS';
  }
  if (/Macintosh/i.test(userAgent) && 'ontouchend' in document) {
    return 'iOS'; // iPadOS newer touch Safari
  }
  if (/Mac/i.test(userAgent)) {
    return 'macOS';
  }
  if (/Win/i.test(userAgent)) {
    return 'Windows';
  }
  if (/Linux/i.test(userAgent)) {
    return 'Linux';
  }
  return 'Dispositivo';
}

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showHelpPrompt, setShowHelpPrompt] = useState(false);
  const [showAutoBanner, setShowAutoBanner] = useState(false);
  const [detectedOS, setDetectedOS] = useState('Dispositivo');
  const [copied, setCopied] = useState(false);
  const [isIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    // Check standalone mode
    const checkStandalone = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsStandalone(true);
        return true;
      }
      return false;
    };

    const alreadyStandalone = checkStandalone();
    const os = getOSName();
    setDetectedOS(os);

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Automatic prompt trigger logic based on OS detection
    if (!alreadyStandalone) {
      const dismissed = localStorage.getItem("pwa_prompt_dismissed") === "true";
      if (!dismissed) {
        // Delay auto banner slightly for loading elegance
        const timer = setTimeout(() => {
          setShowAutoBanner(true);
        }, 2500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("beforeinstallprompt", handler);
        };
      }
    }

    // Custom listener to force open the guide from the sidebar helper
    const handleForceOpenGuide = () => {
      setShowHelpPrompt(true);
      setShowAutoBanner(false);
    };

    window.addEventListener("open-pwa-install-guide", handleForceOpenGuide);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("open-pwa-install-guide", handleForceOpenGuide);
    };
  }, []);

  const copyDirectLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  const triggerNativePrompt = () => {
    if (isIframe) {
      // Breakout of preview iframe for proper web browser capabilities
      window.open(window.location.href, "_blank");
      return;
    }
    if (promptInstall) {
      promptInstall.prompt();
      promptInstall.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === "accepted") {
          setIsStandalone(true);
          setShowAutoBanner(false);
          setShowHelpPrompt(false);
        }
      });
    } else {
      // Open detailed browser guide
      setShowHelpPrompt(true);
      setShowAutoBanner(false);
    }
  };

  const dismissAutoPrompt = () => {
    localStorage.setItem("pwa_prompt_dismissed", "true");
    setShowAutoBanner(false);
    // Broadcast status change in order for sidebar key visual badge to active instantly
    window.dispatchEvent(new CustomEvent("pwa_prompt_status_updated"));
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      <button
        id="btn-install-pwa"
        onClick={triggerNativePrompt}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] rounded-full text-xs font-semibold transition-all shadow-lg shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        Instalar PWA
      </button>

      {/* AUTOMATIC SYSTEM-DETECTED PROMPT OVERLAY */}
      {showAutoBanner && (
        <div 
          id="pwa-auto-banner"
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm bg-[#16191E] border border-[#C5A059]/35 rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-12 duration-300 select-none cursor-default"
        >
          <button 
            onClick={dismissAutoPrompt}
            className="absolute top-3 right-3 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center shrink-0 border border-[#C5A059]/20">
              {detectedOS === 'iOS' || detectedOS === 'Android' ? (
                <Smartphone className="w-5 h-5 text-[#C5A059]" />
              ) : (
                <Monitor className="w-5 h-5 text-[#C5A059]" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-[#E2E8F0] text-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
                Instalar no {detectedOS}
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed pr-2">
                {isIframe ? (
                  <span>Para conseguir instalar no celular, você precisa abrir o aplicativo original fora do simulador do estúdio de testes.</span>
                ) : (
                  <span>Instale o <strong>Hermes IA</strong> para acesso offline instantâneo, leitura fluida da Bíblia e criação ágil de sermões sem abas do navegador.</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end text-xs">
            {isIframe ? (
              <>
                <button
                  onClick={copyDirectLink}
                  className="px-3 py-1.5 text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 font-bold transition-colors"
                >
                  {copied ? "Copiado!" : "Copiar Link"}
                </button>
                <button
                  onClick={() => window.open(window.location.href, "_blank")}
                  className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#D4AF68] text-black font-bold rounded-lg transition-colors shadow"
                >
                  Abrir no Navegador
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={dismissAutoPrompt}
                  className="px-3 py-1.5 text-[#94A3B8] hover:text-[#E2E8F0] font-medium transition-colors"
                >
                  Depois
                </button>
                <button
                  onClick={triggerNativePrompt}
                  className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#D4AF68] text-black font-bold rounded-lg transition-colors shadow"
                >
                  Instalar Agora
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* DETAILED OS-SPECIFIC USER INSTALATION GUIDE */}
      {showHelpPrompt && (
        <div 
          id="pwa-install-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer" 
          onClick={() => setShowHelpPrompt(false)}
        >
          <div 
            className="bg-[#16191E] border border-[#C5A059]/30 rounded-2xl w-full max-w-md p-6 shadow-2xl mb-8 sm:mb-0 animate-in slide-in-from-bottom-8 duration-200 cursor-default" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#C5A059]/80 uppercase tracking-widest block mb-0.5">
                  Guia do Usuário
                </span>
                <h3 className="font-serif font-bold text-white text-lg flex items-center gap-2">
                  Instalação no {detectedOS}
                </h3>
              </div>
              <button 
                onClick={() => setShowHelpPrompt(false)} 
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#94A3B8] pb-5 leading-relaxed bg-[#16191E]">
              {isIframe && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl space-y-2 mb-2">
                  <p className="font-bold flex items-center gap-1.5 text-xs text-amber-200">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    Ambiente de Testes Detectado
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#CBD5E1]">
                    Instalações PWA requerem um contexto isolado de navegador seguro (HTTPS direto). 
                    Copie o link abaixo para abrir no navegador do seu smartphone.
                  </p>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, "_blank")}
                      className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-lg font-bold transition-all text-center text-xs cursor-pointer"
                    >
                      Abrir em Nova Aba
                    </button>
                    <button
                      type="button"
                      onClick={copyDirectLink}
                      className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-bold transition-all text-center text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : null}
                      {copied ? "Copiado!" : "Copiar Link"}
                    </button>
                  </div>
                </div>
              )}

              {detectedOS === 'iOS' ? (
                <>
                  <p>Siga estas etapas recomendadas no navegador <strong>Safari</strong> do iPhone ou iPad:</p>
                  <ol className="space-y-2.5">
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Toque no ícone de <strong>Compartilhar</strong> (retângulo com seta para cima) na barra inferior ou superior.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Role a folha de opções para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Renomeie se desejar e toque em <strong>"Adicionar"</strong> no canto superior direito do painel de confirmação.</span>
                    </li>
                  </ol>
                </>
              ) : detectedOS === 'Android' ? (
                <>
                  <p>Siga estes passos rápidos na sua versão móvel do navegador <strong>Chrome</strong>:</p>
                  <ol className="space-y-2.5">
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Toque no ícone de <strong>três pontos horizontais/verticais</strong> disposto no cabeçalho superior direito.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Selecione a guia de ação intitulada <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Aprove o pop-up de segurança para que o atalho oficial do Hermes apareça nativamente no celular.</span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>Obtenha o aplicativo de desktop diretamente do navegador:</p>
                  <ol className="space-y-2.5">
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Veja no topo da barra de ferramentas (na barra de endereços do Chrome/Edge) o ícone de <strong>instalação rápida</strong> (um monitor com seta ou um sinal de mais "+").</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Caso não localize, clique no <strong>menu de opções</strong> (três pontos) no canto direito de sua tela.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Selecione a ação <strong>"Salvar e compartilhar"</strong> &gt; <strong>"Instalar aplicativo..."</strong> para desfrutar do layout exclusivo.</span>
                    </li>
                  </ol>
                </>
              )}
            </div>

            <button 
              id="pwa-close-btn"
              onClick={() => {
                setShowHelpPrompt(false);
                localStorage.setItem("pwa_prompt_dismissed", "true");
                window.dispatchEvent(new CustomEvent("pwa_prompt_status_updated"));
              }}
              className="w-full py-3.5 rounded-xl font-bold bg-[#C5A059] text-black hover:bg-[#D4AF68] transition-colors font-serif shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Concluir Instruções
            </button>
          </div>
        </div>
      )}
    </>
  );
}
