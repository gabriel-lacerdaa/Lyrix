// Tipos mínimos da YouTube IFrame Player API (https://developers.google.com/youtube/iframe_api_reference).

declare namespace YT {
  interface PlayerEvent {
    target: Player;
  }
  interface NumberEvent {
    target: Player;
    data: number;
  }
  interface PlayerOptions {
    videoId: string;
    width?: number | string;
    height?: number | string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: NumberEvent) => void;
      onPlaybackRateChange?: (event: NumberEvent) => void;
      onError?: (event: NumberEvent) => void;
    };
  }
  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    setPlaybackRate(rate: number): void;
    destroy(): void;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
