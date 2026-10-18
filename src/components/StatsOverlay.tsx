import React from 'react';
import { Activity, X, Wifi, Layers, ShieldCheck, Film } from 'lucide-react';
import { formatBitrate, getBufferStatus } from '../utils/stream';

export interface StreamStats {
  resolution: string;
  fps: number;
  bitrate: number;
  bufferLength: number;
  droppedFrames: number;
  totalFrames: number;
  currentLevelIndex: number;
  levelsCount: number;
  isLive: boolean;
  hlsEngine: 'HLS.js' | 'Native HLS' | 'HTML5';
}

interface StatsOverlayProps {
  stats: StreamStats;
  onClose: () => void;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({ stats, onClose }) => {
  const bufferHealth = getBufferStatus(stats.bufferLength);

  return (
    <div
      className="absolute top-16 left-4 z-50 w-84 max-w-[calc(100%-2rem)] rounded-2xl bg-neutral-950/95 backdrop-blur-lg border-2 border-neutral-600 p-4 text-xs text-white shadow-2xl transition-all font-mono select-none ring-4 ring-black/70"
      role="region"
      aria-label="Estatísticas Técnicas do Fluxo"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2 text-amber-400 font-extrabold tracking-wide font-sans text-xs">
          <Activity className="w-4 h-4 text-amber-400" />
          <span>ESTATÍSTICAS DA TRANSMISSÃO</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-300 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          aria-label="Fechar estatísticas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-300 flex items-center gap-1.5 font-sans font-medium">
            <Film className="w-3.5 h-3.5 text-neutral-300" />
            Resolução:
          </span>
          <span className="font-bold text-amber-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
            {stats.resolution || 'Identificando...'}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-300 flex items-center gap-1.5 font-sans font-medium">
            <Wifi className="w-3.5 h-3.5 text-neutral-300" />
            Taxa de Bits:
          </span>
          <span className="font-bold text-emerald-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
            {formatBitrate(stats.bitrate)}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            Buffer:
          </span>
          <span className={`font-semibold ${bufferHealth.color}`}>{bufferHealth.label}</span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 font-sans">Quadros Perdidos:</span>
          <span className="text-neutral-200">
            {stats.droppedFrames} / {stats.totalFrames > 0 ? stats.totalFrames : 0}
            {stats.totalFrames > 0 && (
              <span className="text-neutral-400 ml-1">
                ({((stats.droppedFrames / stats.totalFrames) * 100).toFixed(2)}%)
              </span>
            )}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 font-sans">Níveis de Qualidade:</span>
          <span className="text-neutral-200">
            {stats.levelsCount > 0 ? `${stats.currentLevelIndex >= 0 ? stats.currentLevelIndex + 1 : 'Auto'} / ${stats.levelsCount}` : 'Único (Fixo)'}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 font-sans">Tipo de Transmissão:</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
            {stats.isLive ? 'Transmissão Contínua (Live)' : 'VOD / Gravado'}
          </span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 flex items-center gap-1.5 font-sans">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            Motor de Reprodução:
          </span>
          <span className="font-sans font-medium text-blue-400">{stats.hlsEngine}</span>
        </div>
      </div>
    </div>
  );
};
