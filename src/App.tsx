import React, { useState } from 'react';
import { HlsPlayer } from './components/HlsPlayer';
import { ShortcutsModal } from './components/ShortcutsModal';

export default function App() {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  return (
    <main className="w-full h-screen min-h-[100dvh] bg-black text-neutral-100 flex flex-col overflow-hidden select-none">
      {/* Exclusively the Full-Width Responsive Player */}
      <HlsPlayer onOpenShortcuts={() => setIsShortcutsOpen(true)} />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </main>
  );
}
