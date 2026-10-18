import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Radio,
  Activity,
  PictureInPicture,
  Sliders,
  Check,
  RefreshCw,
  HelpCircle,
  Volume2 as UnmuteIcon,
} from 'lucide-react';
import { StatsOverlay, StreamStats } from './StatsOverlay';
import { getResolutionLabel, formatTime, DEFAULT_PRESETS } from '../utils/stream';

export type AspectRatioMode = 'cover' | 'contain';

interface QualityLevel {
  id: number;
  height?: number;
  width?: number;
  bitrate?: number;
  label: string;
}

interface HlsPlayerProps {
  initialStreamUrl?: string;
  onOpenShortcuts?: () => void;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  initialStreamUrl = DEFAULT_PRESETS[0].url,
  onOpenShortcuts,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active stream URL
  const [streamUrl, setStreamUrl] = useState<string>(initialStreamUrl);
  const [streamName, setStreamName] = useState<string>(DEFAULT_PRESETS[0].title);
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('player_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('player_muted') === 'true';
  });
  const [showAutoplayMutedPill, setShowAutoplayMutedPill] = useState<boolean>(false);

  // Time & Live state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState<boolean>(true);

  // Controls UI state
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('contain');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quality levels
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [activeResolution, setActiveResolution] = useState<string>('Auto');

  // Stats
  const [stats, setStats] = useState<StreamStats>({
    resolution: '',
    fps: 0,
    bitrate: 0,
    bufferLength: 0,
    droppedFrames: 0,
    totalFrames: 0,
    currentLevelIndex: -1,
    levelsCount: 0,
    isLive: true,
    hlsEngine: 'HLS.js',
  });

  // Reset hide controls timer
  const triggerControlsActivity = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !showSettingsMenu && !showStats) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying, showSettingsMenu, showStats]);

  // Load stream with Hls.js or native fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setErrorMessage(null);
    setIsBuffering(true);
    setQualityLevels([]);
    setCurrentLevel(-1);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 20000,
      });

      hlsRef.current = hls;
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(streamUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(false);
        const isStreamLive = hls.config.liveSyncDurationCount !== undefined && video.duration === Infinity;
        setIsLive(isStreamLive || true);

        // Detect bitrate from URL if variant bandwidth is explicit
        let fallbackBitrate = 0;
        const bwMatch = streamUrl.match(/bandwidth\/(\d+)/i);
        if (bwMatch && bwMatch[1]) {
          fallbackBitrate = parseInt(bwMatch[1], 10);
        }

        // Populate quality levels
        if (data.levels && data.levels.length > 0) {
          const levels: QualityLevel[] = data.levels.map((lvl, idx) => ({
            id: idx,
            height: lvl.height,
            width: lvl.width,
            bitrate: lvl.bitrate || fallbackBitrate,
            label: getResolutionLabel(lvl.height, lvl.width, lvl.bitrate || fallbackBitrate),
          }));
          setQualityLevels(levels);
          setStats((prev) => ({
            ...prev,
            levelsCount: levels.length,
            bitrate: prev.bitrate || fallbackBitrate,
            hlsEngine: 'HLS.js',
          }));
        } else if (fallbackBitrate > 0) {
          setStats((prev) => ({
            ...prev,
            bitrate: fallbackBitrate,
            hlsEngine: 'HLS.js',
          }));
        }

        // Playback attempt
        video.volume = volume;
        video.muted = isMuted;

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.warn('Autoplay unmuted blocked, falling back to muted:', err);
              video.muted = true;
              setIsMuted(true);
              setShowAutoplayMutedPill(true);
              video.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
            });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          const res = getResolutionLabel(lvl.height, lvl.width, lvl.bitrate);
          setActiveResolution(res);
          setStats((prev) => ({
            ...prev,
            resolution: `${lvl.width || '?'}x${lvl.height || '?'} (${res})`,
            bitrate: lvl.bitrate,
            currentLevelIndex: data.level,
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS Event Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMessage('Falha temporária de rede. Reconectando...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage('Recuperando decodificação do fluxo...');
              hls.recoverMediaError();
              break;
            default:
              setErrorMessage('Transmissão temporariamente indisponível. Clique em recarregar.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari / iOS
      video.src = streamUrl;
      setStats((prev) => ({ ...prev, hlsEngine: 'Native HLS' }));
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          setShowAutoplayMutedPill(true);
          video.play();
        });
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, reloadCounter]);

  // Buffer and Stats Monitor Loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      let bufferSecs = 0;
      if (video.buffered.length > 0) {
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
            bufferSecs = video.buffered.end(i) - video.currentTime;
            break;
          }
        }
      }

      let dropped = 0;
      let total = 0;
      if ('getVideoPlaybackQuality' in video) {
        const quality = (video as any).getVideoPlaybackQuality();
        dropped = quality.droppedVideoFrames || 0;
        total = quality.totalVideoFrames || 0;
      }

      const isLiveNow = !isFinite(video.duration) || video.duration === 0 || (hlsRef.current?.liveSyncPosition !== undefined);
      setIsLive(isLiveNow);

      if (isLiveNow && hlsRef.current?.liveSyncPosition) {
        const diff = Math.abs(hlsRef.current.liveSyncPosition - video.currentTime);
        setIsAtLiveEdge(diff < 8);
      }

      setStats((prev) => ({
        ...prev,
        bufferLength: bufferSecs,
        droppedFrames: dropped,
        totalFrames: total,
        isLive: isLiveNow,
        resolution: prev.resolution || (video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : ''),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update volume and mute state
  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    setVolume(clamped);
    localStorage.setItem('player_volume', clamped.toString());

    if (clamped === 0) {
      video.muted = true;
      setIsMuted(true);
      localStorage.setItem('player_muted', 'true');
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      localStorage.setItem('player_muted', 'false');
    }
    setShowAutoplayMutedPill(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('player_muted', nextMuted.toString());
    setShowAutoplayMutedPill(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    triggerControlsActivity();
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime + seconds);
    triggerControlsActivity();
  };

  const jumpToLiveEdge = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current?.liveSyncPosition) {
      video.currentTime = hlsRef.current.liveSyncPosition;
    } else if (video.seekable.length > 0) {
      video.currentTime = video.seekable.end(video.seekable.length - 1);
    }
    setIsAtLiveEdge(true);
    triggerControlsActivity();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error('PiP error:', e);
    }
  };

  const handleSelectQuality = (levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
    if (levelIndex === -1) {
      setActiveResolution('Auto');
    } else {
      const lvl = qualityLevels.find((q) => q.id === levelIndex);
      if (lvl) setActiveResolution(lvl.label);
    }
    setShowSettingsMenu(false);
  };

  const switchPreset = (url: string, name: string) => {
    setStreamUrl(url);
    setStreamName(name);
    setReloadCounter((c) => c + 1);
    setShowSettingsMenu(false);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          setShowStats((prev) => !prev);
          triggerControlsActivity();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePiP();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
          break;
        case '0':
          e.preventDefault();
          jumpToLiveEdge();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, isPlaying]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerControlsActivity}
      onTouchStart={triggerControlsActivity}
      className="relative w-full h-screen min-h-[100dvh] max-h-[100dvh] bg-black select-none overflow-hidden flex items-center justify-center"
      role="region"
      aria-label="Reprodutor de Vídeo HLS em Largura Total"
    >
      {/* HTML5 Video Element - Always Full Width */}
      <video
        ref={videoRef}
        className={`w-full h-full ${aspectMode === 'cover' ? 'object-cover' : 'object-contain'} cursor-pointer`}
        playsInline
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 0);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Prominent High-Contrast Unmute Banner */}
      {(showAutoplayMutedPill || isMuted) && (
        <div className="absolute top-14 sm:top-18 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-lg pointer-events-auto">
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                const nextVol = volume > 0 ? volume : 0.8;
                videoRef.current.volume = nextVol;
                setVolume(nextVol);
                setIsMuted(false);
                setShowAutoplayMutedPill(false);
                localStorage.setItem('player_muted', 'false');
                localStorage.setItem('player_volume', nextVol.toString());
              }
            }}
            className="w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-neutral-950 font-black p-3.5 sm:p-4 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.85)] ring-4 ring-yellow-400/70 border-2 border-white flex items-center justify-between gap-3 transition-all hover:scale-102 active:scale-98 cursor-pointer group animate-pulse"
            aria-label="Ativar som do vídeo agora"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-950 text-yellow-400 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                <VolumeX className="w-6 h-6 animate-pulse text-amber-300" />
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-base uppercase tracking-wider font-black leading-tight text-neutral-950">
                  CLIQUE AQUI PARA ATIVAR O SOM
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-neutral-800 leading-tight mt-0.5">
                  Áudio desativado • Clique para ouvir a transmissão
                </p>
              </div>
            </div>

            <div className="shrink-0 bg-neutral-950 text-amber-300 text-xs font-black px-3.5 py-2 rounded-xl shadow-md group-hover:bg-neutral-800 transition">
              OUVIR AGORA
            </div>
          </button>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px] z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin shadow-2xl" />
            <span className="text-xs font-medium text-sky-200 tracking-wider">CARREGANDO...</span>
          </div>
        </div>
      )}

      {/* Big Center Play/Pause button on pause */}
      {!isPlaying && !isBuffering && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 hover:bg-black/30 transition-colors group/center"
          aria-label="Reproduzir transmissão"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-sky-500/90 hover:bg-sky-400 text-white flex items-center justify-center shadow-2xl pl-1.5 group-hover/center:scale-110 transition-transform">
            <Play className="w-10 h-10 fill-white" />
          </div>
        </button>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute top-6 inset-x-4 max-w-md mx-auto z-50 bg-neutral-900/95 border border-rose-600/80 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Technical Stats Overlay */}
      {showStats && (
        <StatsOverlay stats={stats} onClose={() => setShowStats(false)} />
      )}

      {/* Top Overlay: EXACTLY ONE "AO VIVO" BADGE WITH INTENSE CONTRAST */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex items-center justify-between gap-4 pointer-events-none ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Single 'AO VIVO' Badge in the entire application - Maximum Prominence */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-widest bg-red-600 text-white shadow-[0_0_22px_rgba(239,68,68,0.85)] ring-2 ring-white/90 border border-red-500 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            AO VIVO
          </span>
          <span className="hidden sm:inline-block text-xs sm:text-sm font-bold text-white bg-black/75 px-3 py-1 rounded-xl border border-white/25 backdrop-blur shadow-md truncate max-w-md">
            {streamName}
          </span>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {activeResolution && (
            <span className="hidden sm:inline-block text-xs font-mono font-bold px-3 py-1 rounded-xl bg-black/80 text-amber-300 border-2 border-amber-400/80 shadow-md">
              {activeResolution}
            </span>
          )}

          <button
            onClick={() => setReloadCounter((c) => c + 1)}
            className="p-2.5 text-white hover:text-amber-300 bg-black/80 hover:bg-neutral-800 border-2 border-white/30 rounded-xl transition shadow-md"
            title="Recarregar transmissão"
            aria-label="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-2.5 text-white hover:text-amber-300 bg-black/80 hover:bg-neutral-800 border-2 border-white/30 rounded-xl transition shadow-md"
              title="Atalhos de teclado"
              aria-label="Atalhos de teclado"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Floating Controls Bar - Vivid Colors & High Contrast */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent transition-opacity duration-300 space-y-3 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress / buffer bar */}
        <div className="w-full relative py-1.5 flex items-center cursor-pointer">
          <div className="w-full h-2 sm:h-2.5 bg-neutral-800/90 rounded-full overflow-hidden relative ring-1 ring-white/20">
            <div
              className="absolute left-0 top-0 bottom-0 bg-white/40 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((currentTime + stats.bufferLength) / (duration || currentTime + stats.bufferLength || 1)) * 100)}%`,
              }}
            />
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.9)] rounded-full"
              style={{
                width: isLive && isAtLiveEdge ? '100%' : `${Math.min(100, (currentTime / (duration || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left: Play/Pause, Sync Status, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-2.5 sm:p-3 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 transition text-white hover:text-amber-300 border border-white/25 shadow-md"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Live synchronization indicator */}
            {isLive && (
              <button
                onClick={jumpToLiveEdge}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-md border ${
                  isAtLiveEdge
                    ? 'bg-emerald-500 text-neutral-950 border-white ring-2 ring-emerald-400/50 cursor-default'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 border-white/30'
                }`}
                title="Sincronizar com transmissão direta"
                aria-label="Sincronizar transmissão"
              >
                <Radio className={`w-3.5 h-3.5 ${isAtLiveEdge ? 'animate-pulse' : ''}`} />
                <span className="font-mono text-xs">{isAtLiveEdge ? 'Sincronizado' : 'Sincronizar'}</span>
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded-xl border border-white/20">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/20 transition text-white hover:text-amber-300"
                aria-label={isMuted || volume === 0 ? 'Ativar som' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400 animate-pulse" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5 text-amber-300" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-28 h-2 bg-neutral-600 accent-amber-400 rounded-lg cursor-pointer ring-1 ring-white/20"
                aria-label="Controle de volume"
              />
            </div>

            <span className="hidden sm:inline-block text-xs font-mono font-bold text-neutral-200 bg-black/60 px-2.5 py-1 rounded-lg border border-white/20 shadow">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Right: Aspect Ratio, Stats, Quality/Stream Menu, PiP, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 relative">
            {/* Aspect Ratio Toggle (Cover vs Contain) */}
            <button
              onClick={() => setAspectMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
              className="px-3 py-1.5 text-xs font-extrabold rounded-xl text-white hover:text-amber-300 bg-white/10 hover:bg-white/20 border-2 border-white/30 transition shadow-md"
              title="Ajustar proporção (Ajustar / Preencher)"
              aria-label="Proporção da imagem"
            >
              {aspectMode === 'contain' ? 'Ajustar' : 'Preencher'}
            </button>

            {/* Stats Overlay Toggle (S) */}
            <button
              onClick={() => setShowStats((prev) => !prev)}
              className={`p-2.5 rounded-xl transition border shadow-md ${
                showStats
                  ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                  : 'text-white hover:text-amber-300 bg-white/10 hover:bg-white/20 border-white/25'
              }`}
              title="Estatísticas técnicas (S)"
              aria-label="Estatísticas técnicas"
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* Settings & Channel Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu((prev) => !prev)}
                className={`p-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-bold border shadow-md ${
                  showSettingsMenu
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : 'text-white hover:text-amber-300 bg-white/10 hover:bg-white/20 border-white/25'
                }`}
                title="Configurações de Transmissão e Qualidade"
                aria-label="Configurações do vídeo"
                aria-haspopup="true"
                aria-expanded={showSettingsMenu}
              >
                <Sliders className="w-4 h-4" />
                <span className="hidden md:inline font-mono text-xs">{activeResolution}</span>
              </button>

              {/* Settings Dropdown */}
              {showSettingsMenu && (
                <div
                  className="absolute bottom-14 right-0 w-72 bg-neutral-950 border-2 border-neutral-600 rounded-2xl p-4 shadow-2xl text-xs space-y-3.5 z-50 animate-fadeIn text-white ring-4 ring-black/80"
                  role="menu"
                >
                  {/* Stream Selection */}
                  <div>
                    <span className="text-[11px] uppercase font-black tracking-wider text-amber-300 px-1 block mb-1.5">
                      Fonte de Transmissão
                    </span>
                    <div className="space-y-1">
                      {DEFAULT_PRESETS.map((preset) => {
                        const isSelected = streamUrl === preset.url;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => switchPreset(preset.url, preset.title)}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 font-black shadow-md'
                                : 'hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
                            }`}
                            role="menuitem"
                          >
                            <span className="truncate pr-2">{preset.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-neutral-950 stroke-[3] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Selection */}
                  <div className="border-t border-neutral-800 pt-3">
                    <span className="text-[11px] uppercase font-black tracking-wider text-amber-300 px-1 block mb-1.5">
                      Qualidade HLS (ABR)
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => handleSelectQuality(-1)}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                          currentLevel === -1
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 font-black shadow-md'
                            : 'hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
                        }`}
                        role="menuitem"
                      >
                        <span>Automático (Adaptativo)</span>
                        {currentLevel === -1 && <Check className="w-4 h-4 text-neutral-950 stroke-[3] shrink-0" />}
                      </button>

                      {qualityLevels.map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => handleSelectQuality(lvl.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                            currentLevel === lvl.id
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 font-black shadow-md'
                              : 'hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
                          }`}
                          role="menuitem"
                        >
                          <span>{lvl.label}</span>
                          {currentLevel === lvl.id && <Check className="w-4 h-4 text-neutral-950 stroke-[3] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              onClick={togglePiP}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 border border-white/25 transition hidden sm:inline-block shadow-md"
              title="Janela Flutuante (PiP)"
              aria-label="Janela flutuante"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 border border-white/25 transition shadow-md"
              title="Tela Cheia (F)"
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
