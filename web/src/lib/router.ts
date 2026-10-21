import { useEffect, useState } from "react";

// Roteamento por hash (#/caminho): suficiente para uma ferramenta interna, sem dependência extra.

export function navigate(path: string): void {
  window.location.hash = path;
}

export function useHashPath(): string {
  const read = () => window.location.hash.replace(/^#/, "") || "/";
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return path;
}
