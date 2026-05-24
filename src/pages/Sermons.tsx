import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Sermon } from "../database/db";
import { 
  FileText, Sparkles, Plus, Trash2, Edit3, Eye, Loader2, ArrowLeft,
  ChevronRight, Save, Download, Copy, Check, Sliders, Type, BookOpen, Scroll, HelpCircle,
  Timer, Play, Pause, RotateCcw, AlertTriangle
} from "lucide-react";

const PRESET_SERMONS: Sermon[] = [
  {
    title: "O Padrão da Graça",
    theme: "O Amor Incondicional do Pai",
    text_reference: "Lucas 15:11-32",
    content: `# O Padrão da Graça
## Tema Central: O Amor Incondicional do Pai
## Versículo Base: Lucas 15:20
> "E, levantando-se, foi para seu pai; e, quando ainda estava longe, viu-o seu pai, e se moveu de íntima compaixão e, correndo, lançou-se-lhe ao pescoço e o beijou."

---

## 1. Introdução
- **Quebra-gelo / Ilustração**: Pense em um momento em que você cometeu um grande erro e esperava punição, mas recebeu um abraço acolhedor. Esse é o paradoxo da graça.
- **Contexto**: A parábola do filho pródigo é comumente considerada a maior história já contada. Jesus está revelando o caráter do Pai a um público de publicanos e fariseus.
- **Relevância Prática**: Muitas vezes achamos que precisamos merecer o favor de Deus através de obras, mas a graça destrói a lógica do mérito.

---

## 2. Divisões Principais

### Tópico I: A Ilusão da Independência (v. 12-13)
- **Explicação Teológica**: O pedido de herança do filho mais novo era equivalente a desejar a morte do pai. Ele queria os recursos do pai, mas não a sua presença.
- **Aplicação Prática**: Buscamos a felicidade longe da Videira Verdadeira, gastando de forma desperdiçada nossos dons e tempo em caminhos infrutíferos.
- **Ilustração**: Uma lâmpada que tenta brilhar fora da tomada. Ela logo apaga.

### Tópico II: O Despertar no Deserto (v. 17)
- **Explicação Teológica**: "E, caindo em si...". O fundo do poço foi o local de lucidez espiritual do jovem. O deserto tem fins terapêuticos na teologia bíblica.
- **Aplicação Prática**: Consciência gerada pela crise. O sofrimento muitas vezes é o megafone de Deus para nos despertar da letargia espiritual.
- **Exemplo**: A dor física é um aviso de que algo está errado no corpo; a angústia da alma é o aviso e sinal de volta ao Lar.

### Tópico III: O Abraço que Cancela a Culpa (v. 20)
- **Explicação Teológica**: O pai corre (na antiguidade, um homem idoso e respeitável correr era considerado vergonhoso). O pai corre para poupar o filho do julgamento público do vilarejo (rito do Kezazah).
- **Aplicação Prática**: Deus não espera que você se recupere sozinho antes de voltar. Ele corre ao seu encontro enquanto você ainda está quebrado.
- **Ilustração**: O manto colocado sobre o filho cobriu seus trapos imundos. A justiça de Cristo cobre nossas imundícies.

---

## 3. Conclusão
- **Resumo**: Fomos rebeldes, fomos confrontados, mas fomos aceitos pela graça incondicional.
- **Apelo Prático**: Pare de viver como escravo ou trabalhador assalariado. Viva como filho reconciliado.
- **Oração**: Senhor, ajuda-me a abandonar as mentiras de que devo comprar Teu amor. Aceito a Graça hoje. Amém.`,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

function renderTextWithBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return text;
  return (
    <span>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-white bg-[#C5A059]/10 px-1 py-0.5 rounded border border-[#C5A059]/20">{part}</strong> : part))}
    </span>
  );
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const hStr = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');
  
  return `${hStr}${mStr}:${sStr}`;
}

function SermonMarkdownView({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-4 font-sans leading-relaxed text-[#E2E8F0] select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={idx} className="text-base font-serif font-semibold text-[#C5A059] mt-6 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-4 bg-[#C5A059] rounded-sm inline-block mr-1"></span>
              {trimmed.replace('### ', '')}
            </h5>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={idx} className="text-lg font-serif font-bold text-white border-b border-white/5 pb-2 mt-8 mb-4">
              {trimmed.replace('## ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="text-2xl font-serif font-black text-[#C5A059] border-b-2 border-[#C5A059]/20 pb-3 mt-10 mb-6 uppercase tracking-wider">
              {trimmed.replace('# ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const rawText = trimmed.substring(2);
          return (
            <ul key={idx} className="list-disc pl-6 my-2 space-y-1 text-[#E2E8F0] tracking-wide">
              <li>{renderTextWithBold(rawText)}</li>
            </ul>
          );
        }
        if (trimmed.startsWith('> ')) {
          const blockText = trimmed.substring(2);
          return (
            <blockquote key={idx} className="border-l-4 border-[#C5A059] bg-[#C5A059]/5 px-4 py-3 rounded-r-lg italic text-[#94A3B8] font-serif my-4">
              {blockText}
            </blockquote>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <ol key={idx} className="list-decimal pl-6 my-3 space-y-1 text-[#E2E8F0]">
              <li>{renderTextWithBold(numMatch[2])}</li>
            </ol>
          );
        }
        if (trimmed === '---') {
          return <hr key={idx} className="border-white/5 my-8" />;
        }
        if (!trimmed) {
          return <div key={idx} className="h-3" />;
        }
        return (
          <p key={idx} className="mb-3 text-[#E2E8F0] tracking-wide">
            {renderTextWithBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function Sermons() {
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  
  // Training Mode stopwatch states
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [trainingSeconds, setTrainingSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [targetTime, setTargetTime] = useState<number>(30); // in minutes, 0 means endless

  useEffect(() => {
    let interval: any = null;
    if (isTrainingMode && isTimerRunning) {
      interval = setInterval(() => {
        setTrainingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTrainingMode, isTimerRunning]);

  // AI Generator Form
  const [genTheme, setGenTheme] = useState('');
  const [genPassage, setGenPassage] = useState('');
  const [genStyle, setGenStyle] = useState('expositivo');
  const [genAudience, setGenAudience] = useState('geral');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Manual Editor Values
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [passage, setPassage] = useState('');
  const [content, setContent] = useState('');

  // Reader Settings
  const [fontSize, setFontSize] = useState<'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl'>('text-base');
  const [copied, setCopied] = useState(false);

  // Fetch local sermons
  const sermonsList = useLiveQuery(() => db.sermons.orderBy('updated_at').reverse().toArray(), []);

  // Seed default sermon if list is empty
  useEffect(() => {
    const seedSermons = async () => {
      if (sermonsList !== undefined && sermonsList.length === 0) {
        try {
          await db.sermons.add(PRESET_SERMONS[0]);
        } catch (e) {
          console.error("Failed to seed preset sermons", e);
        }
      }
    };
    seedSermons();
  }, [sermonsList]);

  const handleOpenSermon = (sermon: Sermon) => {
    setSelectedSermon(sermon);
    setTitle(sermon.title);
    setTheme(sermon.theme || '');
    setPassage(sermon.text_reference || '');
    setContent(sermon.content);
    setIsTrainingMode(false);
    setTrainingSeconds(0);
    setIsTimerRunning(false);
    setViewMode('view');
  };

  const handleCreateNewClick = () => {
    setTitle('');
    setTheme('');
    setPassage('');
    setContent(`# Título do Esboço
## Tema Central: 
## Versículo Base: 

---

## 1. Introdução
- Digite sua introdução aqui...

---

## 2. Divisões Principais

### Tópico I: 
- Explicação profunda...
- Aplicação prática...`);
    setViewMode('create');
  };

  const handleSaveSermon = async () => {
    if (!title.trim()) {
      alert("Escreva o título do sermão.");
      return;
    }
    const rightNow = new Date().toISOString();
    try {
      if (viewMode === 'edit' && selectedSermon?.id) {
        await db.sermons.update(selectedSermon.id, {
          title,
          theme,
          text_reference: passage,
          content,
          updated_at: rightNow
        });
        const updated = await db.sermons.get(selectedSermon.id);
        if (updated) setSelectedSermon(updated);
        setViewMode('view');
      } else {
        const newId = await db.sermons.add({
          title,
          theme,
          text_reference: passage,
          content,
          created_at: rightNow,
          updated_at: rightNow
        });
        const created = await db.sermons.get(newId);
        if (created) setSelectedSermon(created);
        setViewMode('view');
      }
    } catch (e) {
      console.error("Error saving sermon sketch", e);
      alert("Erro ao salvar esboço.");
    }
  };

  const handleDeleteSermon = async (id: number) => {
    if (confirm("Deseja realmente excluir este esboço de sermão permanentemente?")) {
      try {
        await db.sermons.delete(id);
        if (selectedSermon?.id === id) {
          setSelectedSermon(null);
          setViewMode('list');
        }
      } catch (e) {
        console.error("Error deleting sermon", e);
      }
    }
  };

  const handleGenerateAISermon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTheme.trim()) {
      alert("Escreva um tópico ou tema central.");
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGenerationSteps(["Consultando fontes teológicas...", "Sintetizando princípios homiléticos..."]);

    const timers = [
      setTimeout(() => setGenerationSteps(prev => [...prev, "Buscando referências cruzadas exatas..."]), 1500),
      setTimeout(() => setGenerationSteps(prev => [...prev, "Estruturando divisões principais e esboçando ilustrações..."]), 3500),
      setTimeout(() => setGenerationSteps(prev => [...prev, "Redigindo aplicações práticas para o cotidiano moderno..."]), 5000)
    ];

    try {
      const response = await fetch("/api/generate-sermon-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: genTheme,
          passage: genPassage,
          style: genStyle,
          audience: genAudience
        })
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar o sermão. Tente novamente em instantes.");
      }

      const data = await response.json();
      
      // Save it locally!
      const rightNow = new Date().toISOString();
      const newId = await db.sermons.add({
        title: data.title || `Sermão: ${genTheme}`,
        theme: data.theme || genTheme,
        text_reference: data.text_reference || genPassage,
        content: data.content || "Não foi possível redigir o corpo do esboço.",
        created_at: rightNow,
        updated_at: rightNow
      });

      const generated = await db.sermons.get(newId);
      if (generated) {
        setSelectedSermon(generated);
        setTitle(generated.title);
        setTheme(generated.theme || '');
        setPassage(generated.text_reference || '');
        setContent(generated.content);
        
        // Reset inputs
        setGenTheme('');
        setGenPassage('');
        setViewMode('view');
      }
    } catch (err: any) {
      console.error("Error generating sermons", err);
      setAiError(err.message || "Não foi possível conectar-se ao assistente Hermes.");
    } finally {
      setIsGenerating(false);
      timers.forEach(clearTimeout);
    }
  };

  const copyToClipboard = () => {
    if (!selectedSermon) return;
    navigator.clipboard.writeText(selectedSermon.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxtSermon = () => {
    if (!selectedSermon) return;
    const blob = new Blob([selectedSermon.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedSermon.title.toLowerCase().replace(/\s+/g, '_')}_esboco.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 p-4 md:p-8">
      {/* HEADER SECTION */}
      {viewMode === 'list' && (
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-[#E2E8F0] tracking-tight flex items-center gap-3">
              <Scroll className="w-8 h-8 text-[#C5A059]" />
              Sermões e Esboços
            </h2>
            <p className="text-[#94A3B8] text-sm md:text-base">
              Esboce, organize e prepare pregações impactantes inspiradas pelo assistente teológico Hermes.
            </p>
          </div>
          <button
            onClick={handleCreateNewClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF68] text-[#0F1115] font-bold rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Criar Manualmente
          </button>
        </header>
      )}

      {/* AI GENERATION WIZARD - ONLY LIST VIEW */}
      {viewMode === 'list' && (
        <section className="bg-[#1C2026] rounded-2xl p-6 border border-white/5 space-y-6">
          <div className="flex items-center gap-2 text-[#C5A059] font-serif font-semibold text-lg">
            <Sparkles className="w-5 h-5 text-[#C5A059]" />
            Gerar Esboço com Hermes IA
          </div>
          
          <form onSubmit={handleGenerateAISermon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Tema / Assunto do Sermão *
              </label>
              <input
                type="text"
                required
                value={genTheme}
                onChange={e => setGenTheme(e.target.value)}
                placeholder="Ex: O Poder da Reconciliação, Fé que Move Montanhas"
                disabled={isGenerating}
                className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Texto ou Passagem de Referência
              </label>
              <input
                type="text"
                value={genPassage}
                onChange={e => setGenPassage(e.target.value)}
                placeholder="Ex: Mateus 14:22-33, Efésios 2:1-10"
                disabled={isGenerating}
                className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Estilo de Sermão
              </label>
              <select
                value={genStyle}
                onChange={e => setGenStyle(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              >
                <option value="expositivo">Expositivo (Estuda a passagem versículo a versículo)</option>
                <option value="tematico">Temático (Focado no tema usando vários textos bíblicos)</option>
                <option value="textual">Textual (Desenvolve o esboço a partir das palavras de um versículo)</option>
                <option value="narrativo">Narrativo (Retrata as sagradas histórias através de drama/personagens)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Público Alvo
              </label>
              <select
                value={genAudience}
                onChange={e => setGenAudience(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              >
                <option value="geral">Geral (Congregação variada)</option>
                <option value="jovens">Jovens (Conexão moderna, linguagem informal)</option>
                <option value="casais">Casais / Família (Foco em relacionamentos e lar)</option>
                <option value="liderança">Liderança / Obreiros (Chamado de postura teológica e integridade)</option>
                <option value="evangelístico">Evangelístico (Pessoas buscando reconciliação com a cruz)</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 pt-2">
              {isGenerating ? (
                <div className="bg-[#16191E] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                  <p className="text-sm text-[#C5A059] font-medium animate-pulse">
                    O Hermes está redigindo seu esboço...
                  </p>
                  <div className="w-full max-w-sm bg-white/5 h-1 rounded overflow-hidden">
                    <div className="bg-[#C5A059] h-full animate-infinite-loading rounded" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="text-center">
                    {generationSteps.map((step, sIdx) => (
                      <div key={sIdx} className="text-xs text-[#94A3B8] animate-in fade-in duration-200">
                        ✓ {step}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3 bg-[#C5A059]/10 border border-[#C5A059]/30 hover:bg-[#C5A059]/20 text-[#C5A059] font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Estruturar e Redigir com IA
                </button>
              )}

              {aiError && (
                <div className="mt-3 bg-red-500/10 text-red-500 p-3 rounded-xl border border-red-500/20 text-xs">
                  {aiError}
                </div>
              )}
            </div>
          </form>
        </section>
      )}

      {/* SAVED OUTLINES LIST - ONLY LIST VIEW */}
      {viewMode === 'list' && (
        <section className="space-y-4">
          <h3 className="text-lg font-serif font-semibold text-white">Sermões Salvos</h3>
          
          {!sermonsList ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#C5A059]" />
            </div>
          ) : sermonsList.length === 0 ? (
            <div className="text-center py-12 bg-[#1C2026] border border-white/5 rounded-2xl">
              <FileText className="w-12 h-12 text-[#4B5563] mx-auto mb-3" />
              <p className="text-sm text-[#94A3B8]">Você ainda não tem nenhum sermão salvo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sermonsList.map((sermon) => (
                <div
                  key={sermon.id}
                  onClick={() => handleOpenSermon(sermon)}
                  className="bg-[#1C2026] border border-white/5 hover:border-[#C5A059]/30 rounded-2xl p-5 flex flex-col justify-between hover:translate-y-[-2px] transition-all cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-serif text-lg font-semibold text-[#E2E8F0] group-hover:text-[#C5A059] transition-colors leading-snug">
                        {sermon.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sermon.id) handleDeleteSermon(sermon.id);
                        }}
                        className="p-1 text-[#4B5563] hover:text-red-500 rounded transition-colors"
                        title="Deletar sermão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {sermon.theme && (
                      <span className="text-xs text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded font-sans inline-block">
                        Tema: {sermon.theme}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-[#94A3B8]">
                    <span className="flex items-center gap-1 font-serif text-[#E2E8F0]/80">
                      <BookOpen className="w-3.5 h-3.5 text-[#C5A059]/80" />
                      {sermon.text_reference || 'Tópico Geral'}
                    </span>
                    <span className="flex items-center gap-1 text-[#94A3B8]">
                      Acessar Esboço
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* DETAILED OUTLINE READER / VIEWER */}
      {viewMode === 'view' && selectedSermon && (
        <div className="space-y-6 animate-in fade-in duration-200 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <button
              onClick={() => {
                setViewMode('list');
                setIsTrainingMode(false);
                setIsTimerRunning(false);
                setTrainingSeconds(0);
              }}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-white border border-white/10 transition-colors self-start animate-fade-in"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar aos Sermões
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setViewMode('edit');
                  setIsTrainingMode(false);
                  setIsTimerRunning(false);
                  setTrainingSeconds(0);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#C5A059]" />
                Editar
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={downloadTxtSermon}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-[#C5A059] hover:bg-[#D4AF68] text-[#0F1115] rounded-full transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar txt
              </button>
            </div>
          </div>

          <div className="bg-[#1C2026] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 select-text">
            {/* Header info */}
            <div className="space-y-2 border-b border-white/5 pb-4">
              {selectedSermon.theme && (
                <span className="text-xs font-bold text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-1 rounded-full uppercase tracking-wider block w-fit">
                  {selectedSermon.theme}
                </span>
              )}
              <h1 className="text-2xl md:text-3xl font-serif font-black text-[#E2E8F0]">
                {selectedSermon.title}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
                <span>Passagem Base: <strong className="text-white font-serif">{selectedSermon.text_reference || 'Livre'}</strong></span>
                <span>•</span>
                <span>Modificado em: {new Date(selectedSermon.updated_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* PULPIT CONTROLS */}
            <div className="bg-[#16191E] border border-white/5 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#94A3B8]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C5A059]" />
                  <span className="font-semibold text-[#E2E8F0]">Modo Púlpito</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTrainingMode(!isTrainingMode);
                    if (!isTrainingMode) {
                      setTrainingSeconds(0);
                      setIsTimerRunning(true);
                    } else {
                      setIsTimerRunning(false);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                    isTrainingMode 
                      ? "bg-[#C5A059]/15 text-[#C5A059] border-[#C5A059]/30" 
                      : "bg-white/5 hover:bg-white/10 text-[#94A3B8] border-white/5"
                  }`}
                  title="Toggle Practice stopwatch"
                >
                  <Timer className={`w-3.5 h-3.5 ${isTrainingMode && isTimerRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                  <span className="font-bold">Modo Treino</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Type className="w-4 h-4" />
                <button
                  onClick={() => setFontSize('text-sm')}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold ${fontSize === 'text-sm' ? 'bg-[#C5A059] text-black' : 'bg-white/5 hover:bg-white/10 text-[#E2E8F0]'}`}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSize('text-base')}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold ${fontSize === 'text-base' ? 'bg-[#C5A059] text-black' : 'bg-white/5 hover:bg-white/10 text-[#E2E8F0]'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('text-lg')}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold ${fontSize === 'text-lg' ? 'bg-[#C5A059] text-black' : 'bg-white/5 hover:bg-white/10 text-[#E2E8F0]'}`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSize('text-xl')}
                  className={`w-7 h-6 rounded flex items-center justify-center font-bold ${fontSize === 'text-xl' ? 'bg-[#C5A059] text-black' : 'bg-white/5 hover:bg-white/10 text-[#E2E8F0]'}`}
                >
                  A++
                </button>
                <button
                  onClick={() => setFontSize('text-2xl')}
                  className={`w-8 h-6 rounded flex items-center justify-center font-bold ${fontSize === 'text-2xl' ? 'bg-[#C5A059] text-black' : 'bg-white/5 hover:bg-white/10 text-[#E2E8F0]'}`}
                >
                  2G
                </button>
              </div>
            </div>

            {/* Markdown Content Parser */}
            <div className={fontSize}>
              <SermonMarkdownView content={selectedSermon.content} />
            </div>
          </div>

          {/* TRAINING MODE STICKY BOTTOM BAR */}
          {isTrainingMode && (
            <div className="sticky bottom-4 left-0 right-0 z-30 bg-[#16191E]/95 backdrop-blur-md border border-[#C5A059]/35 rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between animate-in slide-in-from-bottom-8 duration-300">
              {/* Left Column */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center shrink-0 border border-[#C5A059]/20">
                  <Timer className={`w-5 h-5 text-[#C5A059] ${isTimerRunning ? 'animate-pulse' : ''}`} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-serif font-bold text-white text-sm">
                    Pregação em Treino
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94A3B8]">Meta:</span>
                    <select
                      value={targetTime}
                      onChange={(e) => setTargetTime(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-[#C5A059] font-bold focus:outline-none cursor-pointer"
                    >
                      <option value={5} className="bg-[#16191E] text-white">5 min</option>
                      <option value={10} className="bg-[#16191E] text-white">10 min</option>
                      <option value={15} className="bg-[#16191E] text-white">15 min</option>
                      <option value={20} className="bg-[#16191E] text-white">20 min</option>
                      <option value={30} className="bg-[#16191E] text-white">30 min</option>
                      <option value={40} className="bg-[#16191E] text-white">40 min</option>
                      <option value={50} className="bg-[#16191E] text-white">50 min</option>
                      <option value={60} className="bg-[#16191E] text-white">60 min</option>
                      <option value={0} className="bg-[#16191E] text-white">Sem Limite</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Center Column: Timer Display */}
              <div className="flex flex-col items-center justify-center">
                <div className={`font-mono text-3xl font-black tracking-wider ${
                  targetTime > 0 && trainingSeconds > targetTime * 60 
                    ? 'text-red-500 animate-pulse' 
                    : targetTime > 0 && trainingSeconds > (targetTime * 60) * 0.9 
                    ? 'text-orange-400' 
                    : 'text-[#C5A059]'
                }`}>
                  {formatTime(trainingSeconds)}
                </div>
                {targetTime > 0 && (
                  <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">
                    {trainingSeconds > targetTime * 60 ? (
                      <span className="text-red-500 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> Tempo Limite Excedido! ({formatTime(trainingSeconds - targetTime * 60)})
                      </span>
                    ) : (
                      <span>Alvo de {targetTime} min • {Math.round((trainingSeconds / (targetTime * 60)) * 100)}%</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isTimerRunning
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20'
                      : 'bg-[#C5A059] text-black hover:bg-[#D4AF68]'
                  }`}
                  title={isTimerRunning ? 'Pausar' : 'Iniciar'}
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Deseja mesmo reiniciar o cronômetro do seu treino?")) {
                      setTrainingSeconds(0);
                    }
                  }}
                  className="p-1.5 bg-white/5 border border-white/10 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Reiniciar tempo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTrainingMode(false);
                    setIsTimerRunning(false);
                    setTrainingSeconds(0);
                  }}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all font-bold text-xs cursor-pointer"
                >
                  Sair do Treino
                </button>
              </div>

              {/* Progress Bar indicator at bottom of card */}
              {targetTime > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-2xl overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      trainingSeconds > targetTime * 60 ? 'bg-red-500' : 'bg-[#C5A059]'
                    }`}
                    style={{ width: `${Math.min((trainingSeconds / (targetTime * 60)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SERMON WRITER & MANUAL EDITOR EDITOR */}
      {(viewMode === 'edit' || viewMode === 'create') && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-xl font-serif font-semibold text-white">
              {viewMode === 'edit' ? 'Editar Esboço' : 'Criar Esboço do Zero'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => viewMode === 'edit' ? setViewMode('view') : setViewMode('list')}
                className="text-xs font-semibold px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-white border border-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSermon}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF68] text-[#0F1115] rounded-full transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Esboço
              </button>
            </div>
          </div>

          <div className="bg-[#1C2026] border border-white/5 rounded-2xl p-6 md:p-8 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                Título do Sermão *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Vivendo na Dependência de Deus"
                className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                  Tema Central
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="Ex: Fé e Submissão"
                  className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                  Referência Bíblica
                </label>
                <input
                  type="text"
                  value={passage}
                  onChange={e => setPassage(e.target.value)}
                  placeholder="Ex: Mateus 6:25-34"
                  className="w-full bg-[#16191E] border border-white/5 p-3 rounded-xl text-[#E2E8F0] placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                  Texto do Esboço (Suporta títulos e listas em Markdown)
                </label>
                <div className="text-[10px] text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Use # Título, ## Subtítulo, - Lista, e &gt; Citação
                </div>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={16}
                placeholder="Insira as introduções, tópicos principais, ilustrações, conclusões..."
                className="w-full bg-[#16191E] border border-white/5 p-4 rounded-xl text-[#E2E8F0] placeholder-[#4B5563] text-sm font-mono focus:outline-none focus:border-[#C5A059] transition-colors leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
