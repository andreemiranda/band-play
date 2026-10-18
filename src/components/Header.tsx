import React from 'react';
import { Tv, Radio, HelpCircle, RefreshCw, Maximize2, Monitor } from 'lucide-react';

interface HeaderProps {
  isLive: boolean;
  isTheaterMode: boolean;
  onToggleTheater: () => void;
  onToggleFullscreen: () => void;
  onOpenShortcuts: () => void;
  onReloadStream: () => void;
  activeStreamTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  isLive,
  isTheaterMode,
  onToggleTheater,
  onToggleFullscreen,
  onOpenShortcuts,
  onReloadStream,
  activeStreamTitle,
}) => {
  return (
    <header className="w-full bg-neutral-950/90 border-b border-neutral-800/80 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Active Stream Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/10">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <Tv className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                PLAYER HLS
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  LARGURA TOTAL
                </span>
              </span>
              {isLive && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  AO VIVO
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate max-w-[240px] sm:max-w-md lg:max-w-xl">
              {activeStreamTitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onReloadStream}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-all flex items-center gap-1.5"
            title="Recarregar fluxo HLS"
            aria-label="Recarregar fluxo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Recarregar</span>
          </button>

          <button
            onClick={onToggleTheater}
            className={`p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              isTheaterMode
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
            }`}
            title="Alternar Modo Cinema (Largura Expandida)"
            aria-label="Modo cinema"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Cinema</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-all flex items-center gap-1.5"
            title="Tela Cheia (F)"
            aria-label="Tela cheia"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tela Cheia</span>
          </button>

          <button
            onClick={onOpenShortcuts}
            className="p-2 text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition"
            title="Atalhos de teclado"
            aria-label="Atalhos de teclado"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
