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
    id: 'globo-tv-bahia-fhd',
    title: 'Globo TV Bahia FHD',
    subtitle: 'Transmissão ao vivo em alta definição (hls1.sua.tv)',
    url: 'http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8',
    type: 'adaptive',
    badge: 'FHD • Ao Vivo',
    description: 'Transmissão HLS ao vivo da Globo TV Bahia FHD com reprodução contínua e estável.',
  },
];

/**
 * Resolves a stream URL for safe playback in the browser.
 * If the current page is served over HTTPS and the stream URL is on an unencrypted HTTP host (like hls1.sua.tv),
 * this routes through the reverse proxy endpoint (/stream-proxy/) to prevent browser Mixed Content
 * and CORS blocking while retaining full compatibility on both Vercel and local development.
 */
export function resolvePlayableStreamUrl(rawUrl: string): string {
  if (typeof window === 'undefined' || !rawUrl) return rawUrl;

  if (rawUrl.includes('hls1.sua.tv')) {
    return rawUrl.replace(/^https?:\/\/hls1\.sua\.tv/i, '/stream-proxy');
  }

  return rawUrl;
}

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
