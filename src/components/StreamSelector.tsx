import React, { useState } from 'react';
import { Radio, Sparkles, Link2, Copy, Check, Play, Info } from 'lucide-react';
import { StreamPreset, DEFAULT_PRESETS, isValidHlsUrl } from '../utils/stream';

interface StreamSelectorProps {
  currentUrl: string;
  onSelectStream: (preset: StreamPreset) => void;
  onCustomStreamUrl: (url: string, title?: string) => void;
}

export const StreamSelector: React.FC<StreamSelectorProps> = ({
  currentUrl,
  onSelectStream,
  onCustomStreamUrl,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const validation = isValidHlsUrl(customInput);
    if (!validation.valid) {
      setErrorMsg(validation.reason || 'URL inválida.');
      return;
    }
    onCustomStreamUrl(customInput.trim(), 'Fluxo HLS Personalizado');
    setCustomInput('');
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <section className="w-full bg-neutral-950/60 border-t border-neutral-800/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-400" />
              Canais e Fontes de Transmissão HLS
            </h2>
            <p className="text-sm text-neutral-400">
              Alterne entre as fontes fornecidas ou insira uma nova URL de manifesto (.m3u8).
            </p>
          </div>
        </div>

        {/* Stream Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_PRESETS.map((preset) => {
            const isSelected = currentUrl === preset.url;
            return (
              <div
                key={preset.id}
                onClick={() => onSelectStream(preset)}
                className={`relative rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-sky-950/30 border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/50'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectStream(preset);
                  }
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                        <Play className="w-4 h-4 fill-sky-400 text-sky-400" />
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-sm sm:text-base leading-tight">
                          {preset.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{preset.subtitle}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                        preset.type === 'adaptive'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="bg-neutral-950/80 rounded-lg p-2.5 border border-neutral-800/80 flex items-center justify-between gap-2 text-xs font-mono text-neutral-400">
                    <span className="truncate max-w-[280px] sm:max-w-md select-all">
                      {preset.url}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(preset.url, preset.id);
                      }}
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition shrink-0"
                      title="Copiar URL"
                      aria-label={`Copiar URL de ${preset.title}`}
                    >
                      {copiedId === preset.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold flex items-center gap-1.5 ${
                      isSelected ? 'text-sky-400' : 'text-neutral-400 group-hover:text-neutral-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-sky-400 animate-pulse' : 'bg-neutral-600'
                      }`}
                    />
                    {isSelected ? 'Sintonizado Agora' : 'Clique para Sintonizar'}
                  </span>
                  <span className="text-[11px] text-neutral-400">Google DAI Event Stream</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom M3U8 URL Input */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5">
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label
                htmlFor="custom-m3u8-input"
                className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4 text-sky-400" />
                Transmitir Link Personalizado (.m3u8 HLS)
              </label>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Compatível com CORS público e transmissões ao vivo
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="custom-m3u8-input"
                type="url"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Exemplo: https://meudominio.com/transmissao/master.m3u8"
                className="flex-1 bg-neutral-950 border border-neutral-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-sky-500/20 shrink-0 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Carregar Fluxo
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium pl-1">{errorMsg}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};
