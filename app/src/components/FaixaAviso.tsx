import { Check, Info, WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { tipografia } from '@/theme/tipografia';
import { useCores } from '@/theme/useCores';

type Props = {
  tom: 'info' | 'erro' | 'sucesso';
  texto: string;
};

/** Faixa logo abaixo do player (anúncio, sem conexão, conexão restabelecida). Nunca fica sobre o player. */
export function FaixaAviso({ tom, texto }: Props) {
  const cores = useCores();
  const { fundo, cor, Icone } = {
    info: { fundo: cores.primariaTinta, cor: cores.sobrePrimariaTinta, Icone: Info },
    erro: { fundo: cores.erroTinta, cor: cores.erro, Icone: WifiOff },
    sucesso: { fundo: cores.sucessoTinta, cor: cores.sucesso, Icone: Check },
  }[tom];

  return (
    <View
      style={[estilos.faixa, { backgroundColor: fundo }]}
      accessibilityRole={tom === 'erro' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Icone size={20} color={cor} strokeWidth={2} style={estilos.icone} />
      <Text style={[tipografia.aviso, estilos.texto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  icone: { marginTop: 1 },
  texto: { flex: 1 },
});
