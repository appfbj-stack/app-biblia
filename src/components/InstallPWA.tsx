import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Monitor, X, Sparkles, Check, Info, AlertTriangle, Copy, ExternalLink, Compass } from 'lucide-react';

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
  const [isInApp, setIsInApp] = useState(false);
  const [isIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    // Check if running inside standalone (installed) mode
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

    // Detect if inside an in-app browser (WhatsApp, Instagram, Facebook, Gmail, etc.)
    const checkInApp = () => {
      const ua = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
      const isInAppUA = /FBAN|FBAV|Instagram|Twitter|Line|LinkedIn|WhatsApp|Messenger|Gmail|Workplace|IAB\/|InAppBrowser|Webview/i.test(ua) ||
                       (/Android/i.test(ua) && /Version\/[0-9.]+/i.test(ua)) || 
                       (/iPhone|iPad|iPod/i.test(ua) && !/Safari/i.test(ua));
      return !!isInAppUA;
    };
    setIsInApp(checkInApp());

    // Instantly capture prompt if already intercepted by index.html script
    const checkGlobalPrompt = () => {
      const globalPrompt = (window as any).deferredPrompt;
      if (globalPrompt) {
        setSupportsPWA(true);
        setPromptInstall(globalPrompt);
      }
    };

    checkGlobalPrompt();

    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    const customPromptHandler = () => {
      checkGlobalPrompt();
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("pwa-prompt-ready", customPromptHandler);

    // Automatic prompt trigger logic
    if (!alreadyStandalone) {
      const dismissed = localStorage.getItem("pwa_prompt_dismissed") === "true";
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowAutoBanner(true);
        }, 2000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("beforeinstallprompt", handler);
          window.removeEventListener("pwa-prompt-ready", customPromptHandler);
        };
      }
    }

    const handleForceOpenGuide = () => {
      setShowHelpPrompt(true);
      setShowAutoBanner(false);
    };

    window.addEventListener("open-pwa-install-guide", handleForceOpenGuide);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-prompt-ready", customPromptHandler);
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

  const getChromeIntentLink = () => {
    const urlWithoutProto = window.location.href.replace(/^https?:\/\//, '');
    return `intent://${urlWithoutProto}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
  };

  const triggerNativePrompt = () => {
    if (isIframe) {
      window.open(window.location.href, "_blank");
      return;
    }

    if (detectedOS === 'Android' && isInApp) {
      // Direct Chrome Intent magic! Opens Google Chrome app directly from inside WhatsApp/Facebook/Gmail!
      window.location.href = getChromeIntentLink();
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
      setShowHelpPrompt(true);
      setShowAutoBanner(false);
    }
  };

  const dismissAutoPrompt = () => {
    localStorage.setItem("pwa_prompt_dismissed", "true");
    setShowAutoBanner(false);
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
        className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] rounded-full text-xs font-semibold transition-all shadow-lg shrink-0 cursor-pointer animate-pulse-subtle"
      >
        <Download className="w-3.5 h-3.5 text-[#C5A059]" />
        {promptInstall ? "Instalar Hermes (Rápido)" : "Instalar PWA"}
      </button>

      {/* AUTOMATIC SYSTEM-DETECTED PROMPT OVERLAY */}
      {showAutoBanner && (
        <div 
          id="pwa-auto-banner"
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm bg-[#16191E] border border-[#C5A059]/35 rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-12 duration-300 select-none cursor-default"
        >
          <button 
            onClick={dismissAutoPrompt}
            className="absolute top-3 right-3 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center shrink-0 border border-[#C5A059]/20">
              {isInApp ? (
                <Compass className="w-5 h-5 text-amber-400 animate-pulse" />
              ) : detectedOS === 'iOS' || detectedOS === 'Android' ? (
                <Smartphone className="w-5 h-5 text-[#C5A059]" />
              ) : (
                <Monitor className="w-5 h-5 text-[#C5A059]" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-[#E2E8F0] text-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
                {isInApp ? "Navegador de App Detectado" : `Instalar no ${detectedOS}`}
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed pr-2">
                {isIframe ? (
                  <span>Para instalar no seu celular, você deve abrir o app fora do simulador de testes.</span>
                ) : isInApp ? (
                  detectedOS === 'Android' ? (
                    <span>Você está usando o WhatsApp/Instagram. Para instalar direto no celular, toque no botão abaixo para abrir diretamente no Google Chrome nativo!</span>
                  ) : (
                    <span>Você está usando um navegador de app. Para instalar, clique nos "três pontinhos" do aplicativo ou no ícone de bússola no canto inferior para abrir no Safari do iPhone!</span>
                  )
                ) : (
                  <span>Instale o <strong>Hermes IA</strong> para acesso offline instantâneo, leitura fluida da Bíblia e controle total sem barreiras do navegador.</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end text-xs">
            {isIframe ? (
              <>
                <button
                  onClick={copyDirectLink}
                  className="px-3 py-1.5 text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 font-bold transition-colors cursor-pointer"
                >
                  {copied ? "Copiado!" : "Copiar Link"}
                </button>
                <button
                  onClick={() => window.open(window.location.href, "_blank")}
                  className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#D4AF68] text-black font-bold rounded-lg transition-colors shadow cursor-pointer"
                >
                  Abrir no Navegador
                </button>
              </>
            ) : isInApp && detectedOS === 'Android' ? (
              <>
                <button
                  onClick={copyDirectLink}
                  className="px-3 py-1.5 text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {copied ? "Copiado!" : "Copiar Link"}
                </button>
                <button
                  onClick={triggerNativePrompt}
                  className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#D4AF68] text-black font-bold rounded-lg transition-colors shadow cursor-pointer flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no Chrome
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={dismissAutoPrompt}
                  className="px-3 py-1.5 text-[#94A3B8] hover:text-[#E2E8F0] font-medium transition-colors cursor-pointer"
                >
                  Depois
                </button>
                <button
                  onClick={triggerNativePrompt}
                  className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#D4AF68] text-black font-bold rounded-lg transition-colors shadow cursor-pointer"
                >
                  {isInApp ? "Ver Como Instalar" : "Instalar Agora"}
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
            className="bg-[#16191E] border border-[#C5A059]/30 rounded-2xl w-full max-w-md p-6 shadow-2xl mb-8 sm:mb-0 animate-in slide-in-from-bottom-8 duration-200 cursor-default shadow-[#C5A059]/5" 
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
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#94A3B8] pb-5 leading-relaxed bg-[#16191E]">
              {/* WARNING FOR IFRAMES OR AUTOMATED PREVIEW BROWSERS */}
              {(isIframe || (typeof window !== 'undefined' && !!window.navigator.webdriver)) && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/35 text-amber-200 rounded-xl space-y-2 mb-3 shadow-md">
                  <p className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    Modo Simulador de Testes (AI Studio / Claude)
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#CBD5E1]">
                    O navegador interno de testes e o simulador lateral **bloqueiam** a instalação direta do aplicativo por regras estritas do sandbox do Google.
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-200 font-medium font-semibold">
                    Para instalar com 1 clique no seu celular ou computador:
                  </p>
                  <ol className="list-decimal pl-4 text-[11px] space-y-1 text-[#CBD5E1]">
                    <li>Clique no botão dourado abaixo para copiar o link.</li>
                    <li>Abra-o no aplicativo normal do seu celular (como o <strong>Google Chrome</strong> ou <strong>Safari</strong> do iPhone).</li>
                    <li>Pronto! Lá você clica em <strong>"Instalar PWA"</strong> e ele será adicionado instantaneamente!</li>
                  </ol>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={copyDirectLink}
                      className="flex-1 py-2 px-3 bg-[#C5A059] hover:bg-[#D4AF68] text-black rounded-lg font-bold transition-all text-center text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-800" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Link Copiado!" : "Copiar Link Real"}
                    </button>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-bold transition-all text-center text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir Nova Guia
                    </a>
                  </div>
                </div>
              )}

              {isInApp && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl space-y-2 mb-2">
                  <p className="font-bold flex items-center gap-1.5 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    Navegador de App Detectado (WhatsApp/Instagram)
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#CBD5E1]">
                    As regras de segurança de celulares Android e iPhone **impedem** que aplicativos como o WhatsApp instalem novos sistemas diretamente de seus chats internos. É por isso que os três pontinhos clássicos de instalação não aparecem para você!
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#CBD5E1] font-semibold">
                    Para instalar, você precisa abrir o Hermes IA no navegador real do celular (Google Chrome no Android ou Safari no iPhone).
                  </p>
                  <div className="flex gap-2 pt-1.5">
                    {detectedOS === 'Android' && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = getChromeIntentLink();
                        }}
                        className="flex-1 py-2 px-3 bg-[#C5A059] hover:bg-[#D4AF68] text-black border border-transparent rounded-lg font-bold transition-all text-center text-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir no Chrome
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={copyDirectLink}
                      className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-bold transition-all text-center text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copiado!" : "Copiar Link"}
                    </button>
                  </div>
                </div>
              )}

              {detectedOS === 'iOS' ? (
                <>
                  <p>Siga estas etapas recomendadas no navegador <strong>Safari</strong> do seu iPhone ou iPad:</p>
                  <ol className="space-y-2.5">
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Toque no ícone de <strong>Compartilhar</strong> (retângulo com seta para cima) na barra inferior ou superior do Safari.</span>
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
                      <span className="pt-0.5 text-[#E2E8F0]">Certifique-se de que você está no <strong>Google Chrome</strong> (fora do WhatsApp, Instagram ou Facebook).</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Toque nos <strong>três pontinhos (⋮)</strong> localizados no canto superior direito do seu navegador Chrome.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-[#1C2026] p-2.5 rounded-xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                      <span className="pt-0.5 text-[#E2E8F0]">Procure pela opção <strong>"Instalar aplicativo"</strong> (ou <strong>"Adicionar à tela inicial"</strong>) e selecione para concluir.</span>
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
