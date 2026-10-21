import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { tipografia } from '@/theme/tipografia';
import { raio } from '@/theme/tokens';
import { useCores } from '@/theme/useCores';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'texto';
  /** 44 px de altura (painel de tradução). O padrão é 52 px. */
  compacto?: boolean;
  /** Ocupa toda a largura disponível. */
  largo?: boolean;
  Icone?: LucideIcon;
};

export function Botao({ titulo, onPress, variante = 'primario', compacto = false, largo = false, Icone }: Props) {
  const cores = useCores();
  const fundo = { primario: cores.primaria, secundario: cores.primariaTinta, texto: 'transparent' }[variante];
  const fundoPressionado = variante === 'primario' ? cores.primariaPressionada : fundo;
  const corTexto = { primario: cores.sobrePrimaria, secundario: cores.sobrePrimariaTinta, texto: cores.primaria }[variante];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        compacto ? estilos.compacto : estilos.normal,
        largo && estilos.largo,
        { backgroundColor: pressed ? fundoPressionado : fundo },
      ]}
    >
      {Icone ? <Icone size={18} color={corTexto} strokeWidth={2} /> : null}
      <Text style={[compacto ? tipografia.botaoCompacto : tipografia.botao, { color: corTexto }]}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  normal: { height: 52, paddingHorizontal: 20, borderRadius: raio.botao },
  compacto: { height: 44, paddingHorizontal: 16, borderRadius: raio.linha },
  largo: { alignSelf: 'stretch' },
});
