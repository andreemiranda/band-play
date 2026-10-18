import React, { useState } from 'react';
import { Header } from './components/Header';
import { HlsPlayer, AspectRatioMode } from './components/HlsPlayer';
import { StreamSelector } from './components/StreamSelector';
import { ShortcutsModal } from './components/ShortcutsModal';
import { DEFAULT_PRESETS, StreamPreset } from './utils/stream';
import {
  Layers,
  Zap,
  Shield,
  Smartphone,
  Maximize2,
  Tv2,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [currentPreset, setCurrentPreset] = useState<StreamPreset>(DEFAULT_PRESETS[0]);
  const [streamUrl, setStreamUrl] = useState<string>(DEFAULT_PRESETS[0].url);
  const [streamTitle, setStreamTitle] = useState<string>(DEFAULT_PRESETS[0].title);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('16:9');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const handleSelectPreset = (preset: StreamPreset) => {
    setCurrentPreset(preset);
    setStreamUrl(preset.url);
    setStreamTitle(preset.title);
    setReloadKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCustomStreamUrl = (url: string, title?: string) => {
    setStreamUrl(url);
    setStreamTitle(title || 'Fluxo HLS Personalizado');
    setReloadKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReloadStream = () => {
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        isLive={true}
        isTheaterMode={isTheaterMode}
        onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
        onToggleFullscreen={() => {
          const elem = document.documentElement;
          if (!document.fullscreenElement) {
            elem.requestFullscreen?.().catch(console.error);
          } else {
            document.exitFullscreen?.().catch(console.error);
          }
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onReloadStream={handleReloadStream}
        activeStreamTitle={streamTitle}
      />

      {/* Main Content Area: Always Full Width */}
      <main className="w-full flex-1 flex flex-col">
        {/* Full Width Player Wrapper */}
        <section
          className={`w-full transition-all duration-300 bg-black flex flex-col justify-center items-center shadow-2xl relative ${
            isTheaterMode ? 'p-0' : 'p-0'
          }`}
          aria-label="Reprodutor de Vídeo"
        >
          <div className="w-full">
            <HlsPlayer
              key={`${streamUrl}-${reloadKey}`}
              streamUrl={streamUrl}
              streamTitle={streamTitle}
              isTheaterMode={isTheaterMode}
              onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
              aspectMode={aspectMode}
              onAspectModeChange={setAspectMode}
            />
          </div>
        </section>

        {/* Channels & Preset Selector Section */}
        <StreamSelector
          currentUrl={streamUrl}
          onSelectStream={handleSelectPreset}
          onCustomStreamUrl={handleCustomStreamUrl}
        />

        {/* Feature Highlights & Specifications */}
        <section className="w-full bg-neutral-950 px-4 sm:px-6 lg:px-8 py-10 border-t border-neutral-800/80">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Tecnologia de Reprodução HLS de Alto Rendimento
              </h2>
              <p className="text-sm text-neutral-400">
                Construído com HLS.js e suporte nativo ao protocolo HTTP Live Streaming (RFC 8216) para estabilidade absoluta e adaptação instantânea a qualquer dispositivo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">Largura Total & Responsivo</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Design adaptável a 100% da largura em smartphones, tablets, monitores widescreen e smart TVs, com modos 16:9, 21:9 Cinema e preenchimento dinâmico.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sem bordas pretas indesejadas</span>
                </div>
              </div>

              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">HLS.js Adaptativo (ABR)</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Comutação automática de bitrate baseada na qualidade da conexão do usuário, reduzindo buffering e garantindo reprodução contínua ininterrupta.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Auto-recuperação de erros de rede</span>
                </div>
              </div>

              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">Controles Profissionais</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Painel de estatísticas técnicas em tempo real (Stats for Nerds), Picture-in-Picture, atalhos de teclado completos e memorização de volume local.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sincronização com ponto ao vivo</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-neutral-950 border-t border-neutral-800/80 py-6 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Reprodutor HLS Adaptativo • Compatível com transmissões ao vivo Google DAI e fluxos .m3u8 universais.
          </p>
          <div className="flex items-center gap-4 text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              HLS Engine Pronto
            </span>
          </div>
        </div>
      </footer>

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
