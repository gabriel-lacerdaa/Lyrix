import { useHashPath } from "./lib/router";
import { NewSongPage } from "./pages/NewSongPage";
import { SongPage } from "./pages/SongPage";
import { SongsListPage } from "./pages/SongsListPage";

export function App() {
  const path = useHashPath();
  const songMatch = path.match(/^\/musicas\/([\w-]+)$/);

  let page;
  if (path === "/") page = <SongsListPage />;
  else if (path === "/nova") page = <NewSongPage />;
  else if (songMatch) page = <SongPage key={songMatch[1]} id={songMatch[1]} />;
  else page = <p>Página não encontrada. <a href="#/">Voltar ao acervo</a></p>;

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          Curadoria · Lyrix
        </a>
        <nav>
          <a href="#/" className={path === "/" ? "active" : ""}>
            Acervo
          </a>
          <a href="#/nova" className={path === "/nova" ? "active" : ""}>
            Nova música
          </a>
        </nav>
      </header>
      <main className="container">{page}</main>
    </>
  );
}
