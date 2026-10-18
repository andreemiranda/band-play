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
  Settings,
  Activity,
  PictureInPicture,
  RotateCcw,
  AlertCircle,
  Sliders,
  Check,
  Volume2 as UnmuteIcon,
} from 'lucide-react';
import { StatsOverlay, StreamStats } from './StatsOverlay';
import { getResolutionLabel, formatTime } from '../utils/stream';

export type AspectRatioMode = '16:9' | '21:9' | 'fill' | 'contain';

interface QualityLevel {
  id: number;
  height?: number;
  width?: number;
  bitrate?: number;
  label: string;
}

interface HlsPlayerProps {
  streamUrl: string;
  streamTitle: string;
  isTheaterMode: boolean;
  onToggleTheater?: () => void;
  aspectMode?: AspectRatioMode;
  onAspectModeChange?: (mode: AspectRatioMode) => void;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  streamUrl,
  streamTitle,
  isTheaterMode,
  aspectMode = '16:9',
  onAspectModeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        // Attempt playback
        video.volume = volume;
        video.muted = isMuted;

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              // Autoplay was blocked by browser policy, try muted
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
              console.error('Fatal network error encountered, attempting recovery...');
              setErrorMessage('Falha na rede ao carregar fragmentos do fluxo. Tentando reconectar...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error encountered, recovering media...');
              setErrorMessage('Erro de mídia detectado. Recuperando decodificação...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal unrecoverable HLS error');
              setErrorMessage('Não foi possível reproduzir a transmissão. Verifique se o link está ativo e com CORS liberado.');
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
    } else {
      setErrorMessage('Este navegador não suporta streaming HLS (HTTP Live Streaming).');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

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

      // Dropped frames inspection via video.getVideoPlaybackQuality()
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
        resolution: prev.resolution || (video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : 'Calculando...'),
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
      setActiveResolution('Auto (Adaptativo)');
    } else {
      const lvl = qualityLevels.find((q) => q.id === levelIndex);
      if (lvl) setActiveResolution(lvl.label);
    }
    setShowSettingsMenu(false);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input
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

  // Sync fullscreen change event
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Compute CSS sizing for aspect mode & full width
  const getAspectClass = () => {
    if (isFullscreen) return 'w-full h-full';
    if (isTheaterMode) return 'w-full h-[65vh] sm:h-[75vh] md:h-[82vh] lg:h-[88vh]';

    switch (aspectMode) {
      case '21:9':
        return 'w-full aspect-[21/9] min-h-[260px] max-h-[85vh]';
      case 'fill':
        return 'w-full h-[55vh] sm:h-[65vh] md:h-[75vh]';
      case 'contain':
        return 'w-full h-[55vh] sm:h-[65vh] md:h-[75vh]';
      case '16:9':
      default:
        return 'w-full aspect-video min-h-[240px] max-h-[85vh]';
    }
  };

  const getVideoFitClass = () => {
    if (aspectMode === 'fill') return 'object-cover';
    return 'object-contain';
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerControlsActivity}
      onTouchStart={triggerControlsActivity}
      className={`relative w-full bg-black select-none overflow-hidden group transition-all duration-300 flex items-center justify-center ${getAspectClass()}`}
      role="region"
      aria-label="Reprodutor de Vídeo HLS em Largura Total"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full ${getVideoFitClass()} cursor-pointer`}
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

      {/* Autoplay Muted Banner Pill */}
      {showAutoplayMutedPill && (
        <button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              setIsMuted(false);
              setShowAutoplayMutedPill(false);
            }
          }}
          className="absolute top-4 right-4 z-40 bg-sky-500/90 hover:bg-sky-400 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 backdrop-blur animate-bounce transition-transform"
          aria-label="Ativar som do vídeo"
        >
          <UnmuteIcon className="w-4 h-4" />
          <span>Vídeo silenciado automaticamente. Clique para ativar som</span>
        </button>
      )}

      {/* Buffering Spinner Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-[2px] z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin shadow-lg" />
            <span className="text-xs font-medium text-sky-200 tracking-wider">CARREGANDO TRANSMISSÃO...</span>
          </div>
        </div>
      )}

      {/* Big Center Play/Pause Indicator on manual pause */}
      {!isPlaying && !isBuffering && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 hover:bg-black/30 transition-colors group/center"
          aria-label="Reproduzir vídeo"
        >
          <div className="w-20 h-20 rounded-full bg-sky-500/90 hover:bg-sky-400 text-white flex items-center justify-center shadow-2xl pl-1 group-hover/center:scale-110 transition-transform">
            <Play className="w-9 h-9 fill-white" />
          </div>
        </button>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute top-4 inset-x-4 max-w-lg mx-auto z-40 bg-rose-950/95 border border-rose-700/80 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-100">Aviso de Reprodução</p>
              <p className="mt-0.5 text-rose-300">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white shrink-0 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Technical Stats Overlay */}
      {showStats && (
        <StatsOverlay stats={stats} onClose={() => setShowStats(false)} />
      )}

      {/* Stream Title Bar (Top gradient) */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 flex items-center justify-between gap-4 pointer-events-none ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600/90 text-white shadow-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            AO VIVO
          </span>
          <h1 className="text-sm sm:text-base font-semibold text-white drop-shadow truncate max-w-sm sm:max-w-md lg:max-w-2xl">
            {streamTitle}
          </h1>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {activeResolution && (
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-black/60 text-sky-300 border border-neutral-700/60 backdrop-blur">
              {activeResolution}
            </span>
          )}
        </div>
      </div>

      {/* Custom Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 space-y-2 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar / DVR buffer bar */}
        <div className="w-full group/seek relative py-1 flex items-center cursor-pointer">
          <div className="w-full h-1.5 bg-neutral-800/80 rounded-full overflow-hidden relative">
            {/* Buffered progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-neutral-600/60 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((currentTime + stats.bufferLength) / (duration || currentTime + stats.bufferLength || 1)) * 100)}%`,
              }}
            />
            {/* Playhead */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-sky-500 rounded-full"
              style={{
                width: isLive && isAtLiveEdge ? '100%' : `${Math.min(100, (currentTime / (duration || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 text-white">
          {/* Left Controls: Play, Live edge, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white"
              aria-label={isPlaying ? 'Pausar transmissão' : 'Reproduzir transmissão'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Jump to Live edge button */}
            {isLive && (
              <button
                onClick={jumpToLiveEdge}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isAtLiveEdge
                    ? 'bg-red-600 text-white cursor-default'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-red-600/80 hover:text-white'
                }`}
                title="Sincronizar com o ponto Ao Vivo"
                aria-label="Ponto ao vivo"
              >
                <span className={`w-2 h-2 rounded-full ${isAtLiveEdge ? 'bg-white animate-ping' : 'bg-neutral-400'}`} />
                AO VIVO
              </button>
            )}

            {/* Volume & Mute */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl hover:bg-white/10 transition text-neutral-200 hover:text-white"
                aria-label={isMuted || volume === 0 ? 'Ativar som' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-24 h-1.5 bg-neutral-700 accent-sky-400 rounded-lg cursor-pointer"
                aria-label="Controle de volume"
              />
            </div>

            {/* Time display */}
            <span className="hidden sm:inline-block text-xs font-mono text-neutral-400">
              {formatTime(currentTime)}
              {duration > 0 && isFinite(duration) && ` / ${formatTime(duration)}`}
            </span>
          </div>

          {/* Right Controls: Aspect ratio, Quality, Stats, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2 relative">
            {/* Technical Stats Toggle */}
            <button
              onClick={() => setShowStats((prev) => !prev)}
              className={`p-2 rounded-xl transition ${
                showStats ? 'bg-sky-500/30 text-sky-400' : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
              title="Estatísticas técnicas do fluxo (S)"
              aria-label="Estatísticas da transmissão"
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* Settings & Quality Selector Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu((prev) => !prev)}
                className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-medium ${
                  showSettingsMenu ? 'bg-sky-500/30 text-sky-400' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
                title="Configurações de Qualidade e Proporção"
                aria-label="Qualidade do vídeo"
                aria-haspopup="true"
                aria-expanded={showSettingsMenu}
              >
                <Sliders className="w-4 h-4" />
                <span className="hidden md:inline font-mono text-[11px]">{activeResolution}</span>
              </button>

              {/* Quality & Aspect menu modal */}
              {showSettingsMenu && (
                <div
                  className="absolute bottom-12 right-0 w-64 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl p-3 shadow-2xl text-xs space-y-3 z-50 animate-fadeIn"
                  role="menu"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 px-2 block mb-1.5">
                      Qualidade HLS (ABR)
                    </span>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => handleSelectQuality(-1)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                          currentLevel === -1
                            ? 'bg-sky-500/20 text-sky-300 font-semibold'
                            : 'hover:bg-neutral-800 text-neutral-300'
                        }`}
                        role="menuitem"
                      >
                        <span>Automático (Adaptativo)</span>
                        {currentLevel === -1 && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </button>

                      {qualityLevels.map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => handleSelectQuality(lvl.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                            currentLevel === lvl.id
                              ? 'bg-sky-500/20 text-sky-300 font-semibold'
                              : 'hover:bg-neutral-800 text-neutral-300'
                          }`}
                          role="menuitem"
                        >
                          <span>{lvl.label}</span>
                          {currentLevel === lvl.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </button>
                      ))}

                      {qualityLevels.length === 0 && (
                        <p className="text-[11px] text-neutral-400 px-2 py-1">
                          Fluxo com qualidade única fixa.
                        </p>
                      )}
                    </div>
                  </div>

                  {onAspectModeChange && (
                    <div className="border-t border-neutral-800 pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 px-2 block mb-1.5">
                        Proporção de Tela
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {(['16:9', '21:9', 'fill', 'contain'] as AspectRatioMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              onAspectModeChange(mode);
                              setShowSettingsMenu(false);
                            }}
                            className={`px-2 py-1 rounded text-center transition ${
                              aspectMode === mode
                                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                                : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {mode === '16:9' ? '16:9 Padrão' : mode === '21:9' ? '21:9 Cinema' : mode === 'fill' ? 'Preencher' : 'Ajustar'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              onClick={togglePiP}
              className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition hidden sm:inline-block"
              title="Janela Flutuante / Picture-in-Picture (P)"
              aria-label="Picture in picture"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition"
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
