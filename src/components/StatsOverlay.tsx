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
      className="absolute top-14 left-4 z-50 w-80 max-w-[calc(100%-2rem)] rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-700/80 p-4 text-xs text-neutral-200 shadow-2xl transition-all font-mono select-none"
      role="region"
      aria-label="Estatísticas Técnicas do Fluxo"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold tracking-wide font-sans">
          <Activity className="w-4 h-4" />
          <span>ESTATÍSTICAS DA TRANSMISSÃO</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded transition-colors"
          aria-label="Fechar estatísticas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 flex items-center gap-1.5 font-sans">
            <Film className="w-3.5 h-3.5 text-neutral-400" />
            Resolução:
          </span>
          <span className="font-semibold text-neutral-100">{stats.resolution || 'Identificando...'}</span>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <span className="text-neutral-400 flex items-center gap-1.5 font-sans">
            <Wifi className="w-3.5 h-3.5 text-neutral-400" />
            Taxa de Bits:
          </span>
          <span className="font-semibold text-emerald-300">{formatBitrate(stats.bitrate)}</span>
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
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-red-950/70 text-red-300 border border-red-800/50">
            {stats.isLive ? 'AO VIVO (Live Stream)' : 'VOD / Gravado'}
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
