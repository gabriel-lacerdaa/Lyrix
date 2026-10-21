import { Check, Music } from 'lucide-react-native';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Botao } from '@/components/Botao';
import { Esqueleto } from '@/components/Esqueleto';
import { SeloPequeno } from '@/components/EstadoMensagem';
import { tipografia } from '@/theme/tipografia';
import { toqueMinimo } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

/** Marcador discreto "♪ Instrumental" (tela 07). Não é tocável. */
export function LinhaInstrumental({ onLayout }: { onLayout?: (evento: LayoutChangeEvent) => void }) {
  const cores = useCores();
  return (
    <View style={estilos.instrumental} onLayout={onLayout} accessible accessibilityLabel="Trecho instrumental">
      <Music size={18} color={cores.texto2} strokeWidth={2} />
      <Text style={[tipografia.legendaForte, { color: cores.texto2 }]}>Instrumental</Text>
    </View>
  );
}

/** Card ao fim da música (tela 14). Não há próxima música automática. */
export function CardFim({ onVoltar }: { onVoltar: () => void }) {
  const cores = useCores();
  return (
    <View
      style={[estilos.cardFim, { backgroundColor: cores.superficie, borderColor: cores.borda }]}
      accessibilityLiveRegion="polite"
    >
      <SeloPequeno Icone={Check} tom="sucesso" />
      <Text style={[tipografia.tituloMensagem, estilos.centro, { color: cores.texto }]}>Fim da música</Text>
      <Text style={[tipografia.mensagemTexto, estilos.centro, estilos.textoFim, { color: cores.texto2 }]}>
        Para estudar outra, volte ao acervo e escolha uma nova música.
      </Text>
      <Botao titulo="Voltar ao acervo" largo onPress={onVoltar} />
    </View>
  );
}

// Larguras das linhas do esqueleto, iguais às de 09-musica-carregando.html.
const LARGURAS = ['58%', '82%', '70%', '88%', '64%', '76%', '52%', '80%'] as const;

/** Letra carregando (tela 09). */
export function LetraEsqueleto() {
  return (
    <View style={estilos.esqueleto} accessible accessibilityLabel="Carregando letra">
      {LARGURAS.map((largura, i) => (
        <Esqueleto key={i} largura={largura} altura={18} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  instrumental: { height: toqueMinimo, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardFim: {
    marginTop: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  centro: { textAlign: 'center' },
  textoFim: { marginBottom: 6 },
  esqueleto: { paddingVertical: 24, paddingHorizontal: 22, gap: 26 },
});
