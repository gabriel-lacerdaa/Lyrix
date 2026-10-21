import { useEffect, useRef, useState } from "react";
import { buildLrc, countOutOfOrder, formatTimestamp, parseLrc, type TimedLine } from "../lib/lrc";
import { SOURCE_LABELS } from "../lib/format";
import { useLyricSync, useStoredNumber } from "../lib/sync";
import type { AdminSong, SongUpdate } from "../lib/types";
import { PLAYING } from "../lib/youtube";
import { YouTubePlayer } from "./YouTubePlayer";

interface Props {
  song: AdminSong;
  busy: boolean;
  onSave: (update: SongUpdate) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
}

const RATES = [0.5, 0.75, 1];

const linesFromSong = (song: AdminSong): TimedLine[] =>
  song.lines.map((line) => ({ startMs: line.start_ms, text: line.text }));

/** Revisão: player + letra sincronizada com a mesma lógica do app, ajuste de offset/linhas e modo marcação. */
export function ReviewEditor({ song, busy, onSave, onDirtyChange }: Props) {
  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [lines, setLines] = useState<TimedLine[]>(() => linesFromSong(song));
  const [offsetMs, setOffsetMs] = useState(song.offset_ms);
  const [linesDirty, setLinesDirty] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [tapIndex, setTapIndex] = useState<number | null>(null);
  const [reactionMs, setReactionMs] = useStoredNumber("curadoria.reactionMs", 200);
  const [preview, setPreview] = useState(false);
  const [follow, setFollow] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);

  const offsetDirty = offsetMs !== song.offset_ms;
  const dirty = linesDirty || offsetDirty;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  // Nova versão salva no servidor (LRC ou offset mudou): recarrega o editor.
  // Mudanças só nos dados da música não descartam edições em andamento.
  useEffect(() => {
    setLines(linesFromSong(song));
    setOffsetMs(song.offset_ms);
    setLinesDirty(false);
    setTapIndex(null);
  }, [song.id, song.lrc_raw, song.offset_ms]);

  const { active, resync } = useLyricSync(player, lines, offsetMs, playing, rate);

  // Rolagem automática: segue a linha cantada (ou a próxima a marcar no modo marcação).
  const focusIndex = tapIndex ?? active;
  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[focusIndex] as HTMLElement | undefined;
    if (!follow || !list || !row || row.contains(document.activeElement)) return;
    list.scrollTo({ top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2, behavior: "smooth" });
  }, [focusIndex, follow]);

  const videoNowMs = () => (player ? player.getCurrentTime() * 1000 : 0);

  function seekVideo(videoMs: number) {
    player?.seekTo(Math.max(0, videoMs) / 1000, true);
    resync();
  }

  function seekToLine(index: number) {
    setSelected(index);
    seekVideo(lines[index].startMs + offsetMs - 1000);
  }

  function togglePlay() {
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  }

  function editLines(update: (current: TimedLine[]) => TimedLine[]) {
    setLines(update);
    setLinesDirty(true);
  }

  const setLine = (index: number, patch: Partial<TimedLine>) =>
    editLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const nudge = (index: number, deltaMs: number) =>
    editLines((current) =>
      current.map((line, i) => (i === index ? { ...line, startMs: Math.max(0, line.startMs + deltaMs) } : line)),
    );

  const setLineToNow = (index: number) => setLine(index, { startMs: Math.max(0, Math.round(videoNowMs() - offsetMs)) });

  function insertEmptyAfter(index: number) {
    const now = Math.round(videoNowMs() - offsetMs);
    const startMs = now > lines[index].startMs ? now : lines[index].startMs + 1000;
    editLines((current) => [...current.slice(0, index + 1), { startMs, text: "" }, ...current.slice(index + 1)]);
  }

  const removeLine = (index: number) => editLines((current) => current.filter((_, i) => i !== index));

  function markTap() {
    if (tapIndex === null || !player) return;
    setLine(tapIndex, { startMs: Math.max(0, Math.round(videoNowMs() - offsetMs - reactionMs)) });
    setSelected(tapIndex);
    setTapIndex(tapIndex + 1 < lines.length ? tapIndex + 1 : null);
  }

  // Atalhos de teclado (não funcionam com o foco dentro do vídeo nem em campos de texto).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (target.tagName === "BUTTON") target.blur();
        if (tapIndex !== null) markTap();
        else togglePlay();
      } else if (event.code === "Backspace" && tapIndex !== null) {
        event.preventDefault();
        setTapIndex(Math.max(0, tapIndex - 1));
      } else if (event.code === "Escape") {
        setTapIndex(null);
      } else if ((event.code === "ArrowLeft" || event.code === "ArrowRight") && selected !== null) {
        event.preventDefault();
        nudge(selected, (event.code === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 500 : 50));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function loadCandidate(lrc: string, candidateOffset: number) {
    setLines(parseLrc(lrc));
    setOffsetMs(candidateOffset);
    setLinesDirty(true);
    setSelected(null);
  }

  function discard() {
    setLines(linesFromSong(song));
    setOffsetMs(song.offset_ms);
    setLinesDirty(false);
    setTapIndex(null);
  }

  async function save() {
    const update: SongUpdate = { offset_ms: offsetMs };
    if (linesDirty) {
      update.lrc_raw = buildLrc(lines, { title: song.title, artist: song.artist, lengthMs: song.video_duration_ms });
    }
    if (await onSave(update)) setLinesDirty(false);
  }

  const outOfOrder = countOutOfOrder(lines);
  const candidates = song.lrc_candidates ?? {};

  return (
    <div className="review">
      <aside className="review-side">
        <YouTubePlayer
          videoId={song.youtube_video_id}
          onReady={setPlayer}
          onStateChange={(state) => {
            setPlaying(state === PLAYING);
            resync();
          }}
          onRateChange={(value) => {
            setRate(value);
            resync();
          }}
        />

        <div className="card compact">
          <div className="toolbar">
            <button onClick={togglePlay} disabled={!player}>
              {playing ? "Pausar" : "Tocar"}
            </button>
            <CurrentTime player={player} offsetMs={offsetMs} />
            <label className="inline">
              Velocidade
              <select
                value={rate}
                onChange={(e) => {
                  player?.setPlaybackRate(Number(e.target.value));
                }}
              >
                {RATES.map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="offset">
            <span>
              <strong>Offset</strong> <span className="muted">(vídeo atrasado em relação ao LRC)</span>
            </span>
            <div className="toolbar">
              <button onClick={() => setOffsetMs(offsetMs - 1000)}>−1 s</button>
              <button onClick={() => setOffsetMs(offsetMs - 100)}>−100</button>
              <input
                type="number"
                step={50}
                value={offsetMs}
                onChange={(e) => setOffsetMs(Math.round(Number(e.target.value) || 0))}
                className="offset-input"
              />
              <span>ms</span>
              <button onClick={() => setOffsetMs(offsetMs + 100)}>+100</button>
              <button onClick={() => setOffsetMs(offsetMs + 1000)}>+1 s</button>
            </div>
            <p className="muted small">Letra adiantada → aumente. Letra atrasada → diminua.</p>
          </div>

          <div className="tap">
            {tapIndex === null ? (
              <div className="toolbar">
                <button onClick={() => setTapIndex(selected ?? 0)} disabled={!player || lines.length === 0}>
                  Modo marcação {selected !== null ? `(a partir da linha ${selected + 1})` : ""}
                </button>
                <label className="inline">
                  Reação
                  <input
                    type="number"
                    step={10}
                    value={reactionMs}
                    onChange={(e) => setReactionMs(Math.max(0, Number(e.target.value) || 0))}
                    className="offset-input"
                  />
                  ms
                </label>
              </div>
            ) : (
              <div className="alert info compact">
                <strong>Modo marcação:</strong> toque o vídeo e aperte <kbd>Espaço</kbd> no início da linha{" "}
                {tapIndex + 1}: «{lines[tapIndex]?.text || "(pausa)"}». <kbd>Backspace</kbd> volta uma linha,{" "}
                <kbd>Esc</kbd> sai.
                <div>
                  <button onClick={() => setTapIndex(null)}>Sair do modo marcação</button>
                </div>
              </div>
            )}
            <p className="muted small">
              Atalhos: <kbd>Espaço</kbd> toca/pausa · <kbd>←</kbd>/<kbd>→</kbd> ajusta a linha selecionada em 50 ms
              (com <kbd>Shift</kbd>, 500 ms). Clique fora do vídeo antes de usar.
            </p>
          </div>

          <div className="toolbar save-bar">
            <button className="primary" onClick={save} disabled={!dirty || busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
            <button onClick={discard} disabled={!dirty || busy}>
              Descartar
            </button>
            {dirty && <span className="muted">Alterações não salvas</span>}
          </div>
        </div>

        <Warnings song={song} outOfOrder={outOfOrder} onSelectLine={seekToLine} />

        {(candidates.lrclib || candidates.aligned) && (
          <div className="card compact">
            <strong>Versões geradas</strong>
            <p className="muted small">
              Versão salva: {song.sync_source ? SOURCE_LABELS[song.sync_source] : "—"}. Carregar uma versão substitui o
              editor (salve para aplicar).
            </p>
            <div className="toolbar">
              {candidates.lrclib && (
                <button onClick={() => loadCandidate(candidates.lrclib!, candidates.lrclib_estimated_offset_ms ?? 0)}>
                  Carregar LRCLIB
                  {candidates.lrclib_estimated_offset_ms !== undefined
                    ? ` (offset estimado ${candidates.lrclib_estimated_offset_ms} ms)`
                    : ""}
                </button>
              )}
              {candidates.aligned && (
                <button onClick={() => loadCandidate(candidates.aligned!, 0)}>Carregar alinhamento</button>
              )}
            </div>
          </div>
        )}
      </aside>

      <section className="review-main">
        <div className="toolbar">
          <label className="inline">
            <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
            Prévia do app
          </label>
          <label className="inline">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            Acompanhar
          </label>
          <span className="muted">{lines.length} linhas</span>
        </div>

        <ol ref={listRef} className={preview ? "lyrics preview-mode" : "lyrics"}>
          {lines.map((line, index) => {
            const classes = ["lyric-line"];
            if (index === active) classes.push("active");
            if (index === selected) classes.push("selected");
            if (index === tapIndex) classes.push("tap-target");
            if (index > 0 && line.startMs < lines[index - 1].startMs) classes.push("out-of-order");
            if (!line.text) classes.push("gap");

            if (preview) {
              return (
                <li key={index} className={classes.join(" ")} onClick={() => seekToLine(index)}>
                  {line.text || "♪"}
                </li>
              );
            }
            return (
              <li key={index} className={classes.join(" ")}>
                <button className="time" title="Tocar desde 1 s antes" onClick={() => seekToLine(index)}>
                  {formatTimestamp(line.startMs)}
                </button>
                <button title="−50 ms" onClick={() => nudge(index, -50)}>
                  −
                </button>
                <button title="+50 ms" onClick={() => nudge(index, 50)}>
                  +
                </button>
                <button title="Usar o tempo atual do vídeo" onClick={() => setLineToNow(index)} disabled={!player}>
                  agora
                </button>
                <input
                  className="line-text"
                  value={line.text}
                  placeholder="(pausa instrumental)"
                  onFocus={() => setSelected(index)}
                  onChange={(e) => setLine(index, { text: e.target.value })}
                />
                <button title="Inserir linha vazia (pausa) depois desta" onClick={() => insertEmptyAfter(index)}>
                  + pausa
                </button>
                <button title="Remover linha" className="danger-text" onClick={() => removeLine(index)}>
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function CurrentTime({ player, offsetMs }: { player: YT.Player | null; offsetMs: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (ref.current && player) {
        const videoMs = player.getCurrentTime() * 1000;
        ref.current.textContent = `vídeo ${formatTimestamp(videoMs)} · letra ${formatTimestamp(videoMs - offsetMs)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, offsetMs]);
  return (
    <span ref={ref} className="mono muted">
      --:--.--
    </span>
  );
}

function Warnings({
  song,
  outOfOrder,
  onSelectLine,
}: {
  song: AdminSong;
  outOfOrder: number;
  onSelectLine: (index: number) => void;
}) {
  if (song.sync_warnings.length === 0 && outOfOrder === 0) return null;
  return (
    <div className="card compact">
      <strong>Avisos</strong>
      <ul className="warnings">
        {outOfOrder > 0 && (
          <li className="warn-local">
            {outOfOrder} linha(s) começam antes da anterior (destacadas em vermelho). Ao salvar, o servidor reordena por
            tempo.
          </li>
        )}
        {song.sync_warnings.map((warning, i) => (
          <li key={i}>
            {warning.line_index !== null ? (
              <button className="link" onClick={() => onSelectLine(warning.line_index!)}>
                {warning.message}
              </button>
            ) : (
              warning.message
            )}
          </li>
        ))}
      </ul>
      <p className="muted small">Os avisos do servidor se referem à versão salva.</p>
    </div>
  );
}
