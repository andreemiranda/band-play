import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Espaço ou K', desc: 'Reproduzir / Pausar' },
    { key: 'F', desc: 'Alternar Tela Cheia (Fullscreen)' },
    { key: 'M', desc: 'Silenciar / Ativar Som (Mute)' },
    { key: 'T', desc: 'Modo Cinema / Largura Expandida' },
    { key: 'S', desc: 'Exibir Estatísticas Técnicas da Transmissão' },
    { key: 'P', desc: 'Picture-in-Picture (Janela Flutuante)' },
    { key: 'Seta Cima / Baixo', desc: 'Aumentar / Diminuir Volume (5%)' },
    { key: 'Seta Esquerda / Direita', desc: 'Retroceder / Avançar 10 segundos' },
    { key: '0', desc: 'Sincronizar com transmissão direta' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl p-6 text-neutral-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 text-sky-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 id="shortcuts-title" className="text-base font-semibold text-white">
              Atalhos de Teclado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
            aria-label="Fechar janela de atalhos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-800 text-sm">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex justify-between items-center py-2.5">
              <span className="text-neutral-300">{sc.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-medium bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-md shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-xs text-neutral-400">
          Pressione <kbd className="font-mono bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">ESC</kbd> para fechar a qualquer momento.
        </div>
      </div>
    </div>
  );
};
