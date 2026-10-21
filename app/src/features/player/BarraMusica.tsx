import { ChevronLeft, Pointer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { BotaoIcone } from '@/components/BotaoIcone';
import { tipografia } from '@/theme/tipografia';
import { useCores } from '@/theme/useCores';

type Props = { titulo: string; artista: string; onVoltar: () => void };

/** Barra superior da tela de Música (56 px). */
export function BarraMusica({ titulo, artista, onVoltar }: Props) {
  const cores = useCores();
  return (
    <View style={estilos.barra}>
      <BotaoIcone rotulo="Voltar ao acervo" onPress={onVoltar}>
        <ChevronLeft size={24} color={cores.texto} strokeWidth={2} />
      </BotaoIcone>
      <View style={estilos.textos}>
        <Text style={[tipografia.tituloBarra, { color: cores.texto }]} numberOfLines={1} accessibilityRole="header">
          {titulo}
        </Text>
        <Text style={[tipografia.legenda, { color: cores.texto2 }]} numberOfLines={1}>
          {artista}
        </Text>
      </View>
    </View>
  );
}

/** A única instrução do app sobre os gestos (40 px, abaixo do player). */
export function Dica() {
  const cores = useCores();
  return (
    <View style={[estilos.dica, { borderBottomColor: cores.borda }]}>
      <Pointer size={16} color={cores.texto2} strokeWidth={2} />
      <Text style={[tipografia.legenda, { color: cores.texto2 }]}>Toque numa palavra ou segure uma linha para traduzir</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 6, paddingRight: 12 },
  textos: { flex: 1, minWidth: 0 },
  dica: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
  },
});
