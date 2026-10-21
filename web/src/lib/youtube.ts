// Carrega a IFrame Player API oficial do YouTube uma única vez.

let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeApi(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as typeof YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

export const PLAYING = 1;

export function playerErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "ID de vídeo inválido.";
    case 5:
      return "Erro do player HTML5 do YouTube.";
    case 100:
      return "Vídeo não encontrado (removido ou privado).";
    case 101:
    case 150:
      return "O dono do vídeo não permite a reprodução incorporada.";
    default:
      return `Erro ${code} do player do YouTube.`;
  }
}
