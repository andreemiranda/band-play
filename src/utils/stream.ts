export interface StreamPreset {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: 'adaptive' | 'fixed';
  badge: string;
  description: string;
}

export const DEFAULT_PRESETS: StreamPreset[] = [
  {
    id: 'dai-master',
    title: 'Transmissão Master (Adaptativa Multi-qualidade)',
    subtitle: 'Ajuste dinâmico de resolução e taxa de bits conforme a conexão',
    url: 'https://dai.google.com/linear/hls/pa/event/N7B0wy5aTjygLT6S1jl5DQ/stream/fcd1b4c2-18f0-4f46-8618-2d8034163bd8:SCL2/master.m3u8',
    type: 'adaptive',
    badge: 'Recomendado • Auto ABR',
    description: 'Master playlist HLS com múltiplas taxas de bits (Auto 1080p/720p/480p/360p). Ideal para estabilidade máxima em qualquer largura de banda.',
  },
  {
    id: 'dai-variant-1316k',
    title: 'Transmissão HD Fixa (1316 kbps)',
    subtitle: 'Taxa de bits constante de alta performance para stream direto',
    url: 'https://dai.google.com/linear/hls/pa/event/N7B0wy5aTjygLT6S1jl5DQ/stream/fcd1b4c2-18f0-4f46-8618-2d8034163bd8:SCL2/variant/4655a2736bc29377ab01445e807df955/bandwidth/1316400.m3u8',
    type: 'fixed',
    badge: '1.3 Mbps Direto',
    description: 'Fluxo variante direto com largura de banda de 1316400 bps (~1.3 Mbps), sem alternância dinâmica de qualidade.',
  },
];

/**
 * Validates whether a given string is a valid URL and looks like an HLS / m3u8 stream.
 */
export function isValidHlsUrl(url: string): { valid: boolean; reason?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL vazia ou inválida.' };
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'A URL deve usar o protocolo HTTP ou HTTPS.' };
    }

    const pathname = parsed.pathname.toLowerCase();
    const isM3u8 = pathname.endsWith('.m3u8') || pathname.includes('.m3u8') || parsed.search.toLowerCase().includes('.m3u8');

    if (!isM3u8) {
      return {
        valid: true,
        reason: 'Aviso: a URL não termina com .m3u8, mas será tentada como fluxo HLS.',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Formato de URL inválido.' };
  }
}

/**
 * Formats a bitrate in bits per second to human readable string (e.g., "1.32 Mbps" or "750 kbps").
 */
export function formatBitrate(bps: number): string {
  if (!bps || bps <= 0 || isNaN(bps)) return 'Desconhecido';
  if (bps >= 1_000_000) {
    return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  }
  return `${Math.round(bps / 1_000)} kbps`;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS format.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const hh = hrs.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Returns a human readable resolution label based on dimensions and bitrate.
 */
export function getResolutionLabel(height?: number, width?: number, bitrate?: number): string {
  if (!height && !width) {
    if (bitrate) return formatBitrate(bitrate);
    return 'Automático';
  }

  const h = height || (width ? Math.round(width * (9 / 16)) : 0);

  if (h >= 2160) return `${h}p (4K UHD)`;
  if (h >= 1440) return `${h}p (2K QHD)`;
  if (h >= 1080) return `${h}p (Full HD)`;
  if (h >= 720) return `${h}p (HD)`;
  if (h >= 480) return `${h}p (SD)`;
  if (h >= 360) return `${h}p`;
  if (h > 0) return `${h}p (Baixa)`;

  return 'Automático';
}

/**
 * Evaluates the buffer health and returns a status tag.
 */
export function getBufferStatus(bufferSeconds: number): {
  status: 'healthy' | 'warning' | 'critical';
  label: string;
  color: string;
} {
  if (bufferSeconds >= 10) {
    return { status: 'healthy', label: `Excelente (${bufferSeconds.toFixed(1)}s)`, color: 'text-emerald-400' };
  }
  if (bufferSeconds >= 4) {
    return { status: 'healthy', label: `Estável (${bufferSeconds.toFixed(1)}s)`, color: 'text-green-400' };
  }
  if (bufferSeconds >= 1.5) {
    return { status: 'warning', label: `Moderado (${bufferSeconds.toFixed(1)}s)`, color: 'text-amber-400' };
  }
  return { status: 'critical', label: `Baixo (${bufferSeconds.toFixed(1)}s)`, color: 'text-rose-400' };
}
