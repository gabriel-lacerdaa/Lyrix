import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { tipografia } from '@/theme/tipografia';
import { useCores } from '@/theme/useCores';

export type TomDoSelo = 'primario' | 'erro' | 'sucesso';

type Props = {
  Icone: LucideIcon;
  tom: TomDoSelo;
  titulo: string;
  texto: string;
  /** Botões, em ordem. */
  children?: ReactNode;
  /** `acervo`: tela cheia; `musica`: na área da letra, abaixo do player. */
  variante?: 'acervo' | 'musica';
  /** Erros são anunciados como alerta; os demais estados, como status. */
  alerta?: boolean;
};

/** Estado vazio / erro / sem conexão: selo de 72 px, título, texto e botão largo. */
export function EstadoMensagem({ Icone, tom, titulo, texto, children, variante = 'acervo', alerta = false }: Props) {
  const cores = useCores();
  const selo = {
    primario: { fundo: cores.primariaTinta, icone: cores.sobrePrimariaTinta },
    erro: { fundo: cores.erroTinta, icone: cores.erro },
    sucesso: { fundo: cores.sucessoTinta, icone: cores.sucesso },
  }[tom];

  return (
    <View
      style={[estilos.base, variante === 'acervo' ? estilos.acervo : estilos.musica]}
      accessibilityRole={alerta ? 'alert' : undefined}
      accessibilityLiveRegion={alerta ? 'assertive' : 'polite'}
    >
      <View style={[estilos.selo, { backgroundColor: selo.fundo }]}>
        <Icone size={variante === 'acervo' ? 32 : 28} color={selo.icone} strokeWidth={2} />
      </View>
      <Text style={[tipografia.tituloMensagem, estilos.centro, { color: cores.texto }]}>{titulo}</Text>
      <Text style={[tipografia.mensagemTexto, estilos.centro, estilos.texto, { color: cores.texto2 }]}>{texto}</Text>
      {children}
    </View>
  );
}

/** Selo circular de 52 px, usado no card "Fim da música". */
export function SeloPequeno({ Icone, tom }: { Icone: LucideIcon; tom: TomDoSelo }) {
  const cores = useCores();
  const fundo = { primario: cores.primariaTinta, erro: cores.erroTinta, sucesso: cores.sucessoTinta }[tom];
  const cor = { primario: cores.sobrePrimariaTinta, erro: cores.erro, sucesso: cores.sucesso }[tom];
  return (
    <View style={[estilos.seloPequeno, { backgroundColor: fundo }]}>
      <Icone size={26} color={cor} strokeWidth={2} />
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  acervo: { paddingHorizontal: 32, paddingBottom: 120 },
  musica: { paddingTop: 40, paddingHorizontal: 28, paddingBottom: 80 },
  selo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  seloPequeno: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  centro: { textAlign: 'center' },
  texto: { marginBottom: 12 },
});
