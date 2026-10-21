import { useEffect, useRef, useState } from "react";
import { loadYouTubeApi, playerErrorMessage } from "../lib/youtube";

interface Props {
  videoId: string;
  onReady: (player: YT.Player) => void;
  onStateChange: (state: number) => void;
  onRateChange: (rate: number) => void;
}

/** Player oficial do YouTube (IFrame API), visível e sem nada sobreposto, como no app. */
export function YouTubePlayer({ videoId, onReady, onStateChange, onRateChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onStateChange, onRateChange });
  handlers.current = { onReady, onStateChange, onRateChange };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    let player: YT.Player | null = null;
    let cancelled = false;
    loadYouTubeApi().then((youtube) => {
      if (cancelled || !host) return;
      const mount = document.createElement("div");
      host.appendChild(mount);
      player = new youtube.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: (event) => handlers.current.onReady(event.target),
          onStateChange: (event) => handlers.current.onStateChange(event.data),
          onPlaybackRateChange: (event) => handlers.current.onRateChange(event.data),
          onError: (event) => setError(playerErrorMessage(event.data)),
        },
      });
    });
    return () => {
      cancelled = true;
      player?.destroy();
      if (host) host.innerHTML = "";
    };
  }, [videoId]);

  return (
    <div>
      <div className="player" ref={hostRef} />
      {error && <div className="alert error">{error}</div>}
    </div>
  );
}
