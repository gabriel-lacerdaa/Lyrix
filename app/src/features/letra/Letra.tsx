import { useCallback, useEffect, useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import type { LyricLine } from '@/api/types';
import { AlcasSelecao } from '@/features/traducao/AlcasSelecao';
import {
  faixaNaLinha,
  linhasPermitidas,
  moverAlca,
  palavraMaisProxima,
  type Alca,
  type Retangulo,
  type Selecao,
} from '@/features/traducao/selecao';

import { BotaoVoltarLinha } from './BotaoVoltarLinha';
import { LinhaLetra } from './LinhaLetra';
import { CardFim, LinhaInstrumental } from './Marcadores';
import type { Palavra } from './tokenizar';

// Rolagem automática: linha atual a ~1/3 da área; volta a acompanhar ~5 s depois da rolagem manual.
const FRACAO_DA_LINHA_ATUAL = 1 / 3;
const RETOMAR_APOS_MS = 5000;
const FOLGA = 12;

type Layout = { x: number; y: number; altura: number };

type Props = {
  linhas: readonly LyricLine[];
  palavras: readonly Palavra[][];
  /** Linha em que a música está (inclui linhas vazias); -1 antes da primeira. */
  posicao: number;
  /** Linha destacada em âmbar; -1 = nenhuma (instrumental, anúncio, fim). */
  destacada: number;
  fim: boolean;
  /** Durante um anúncio a letra fica parada. */
  congelada: boolean;
  /** Seleção de palavra ou frase; o painel está aberto enquanto houver seleção. */
  selecao: Selecao | null;
  alturaPainel: number;
  margemInferior: number;
  onTocarPalavra: (linha: number, palavra: number) => void;
  onSegurarLinha: (linha: number) => void;
  onAlterarSelecao: (selecao: Selecao) => void;
  onSoltarAlca: () => void;
  onVoltarAoAcervo: () => void;
};

/** Letra sincronizada (F3): uma linha por verso, cada palavra tocável. */
export function Letra({
  linhas,
  palavras,
  posicao,
  destacada,
  fim,
  congelada,
  selecao,
  alturaPainel,
  margemInferior,
  onTocarPalavra,
  onSegurarLinha,
  onAlterarSelecao,
  onSoltarAlca,
  onVoltarAoAcervo,
}: Props) {
  const reduzirMovimento = useReducedMotion();
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const layoutLinhas = useRef<(Layout | undefined)[]>([]);
  const layoutPalavras = useRef<(Retangulo | undefined)[][]>([]);
  const scrollY = useRef(0);
  const timerRetomar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [alturaArea, setAlturaArea] = useState(0);
  const [manual, setManual] = useState(false);
  const [direcao, setDirecao] = useState<'cima' | 'baixo'>('baixo');
  const [arrastandoAlca, setArrastandoAlca] = useState(false);
  const [alcas, setAlcas] = useState<{ inicio: Retangulo; fim: Retangulo } | null>(null);
  const selecaoAtual = useRef(selecao);
  const quadroPendente = useRef<number | null>(null);

  const marcadorNoTopo = linhas.length > 0 && linhas[0].text.trim() !== '' && linhas[0].start_ms > 0;

  const rolarPara = useCallback(
    (y: number) => rolagem.current?.scrollTo({ y: Math.max(0, y), animated: !reduzirMovimento }),
    [reduzirMovimento],
  );

  const yDaPosicao = useCallback(
    (indice: number): number | null => {
      if (indice < 0) return 0;
      const linha = layoutLinhas.current[indice];
      return linha ? linha.y + linha.altura / 2 - alturaArea * FRACAO_DA_LINHA_ATUAL : null;
    },
    [alturaArea],
  );

  // Rolagem automática: pausada com rolagem manual, com o painel aberto e durante anúncio.
  useEffect(() => {
    if (manual || selecao || congelada || alturaArea === 0) return;
    if (fim) {
      rolagem.current?.scrollToEnd({ animated: !reduzirMovimento });
      return;
    }
    const y = yDaPosicao(posicao);
    if (y !== null) rolarPara(y);
  }, [posicao, manual, selecao, congelada, fim, alturaArea, yDaPosicao, rolarPara, reduzirMovimento]);

  // Ao abrir o painel, a linha estudada sobe para ficar acima dele.
  const linhaInicio = selecao?.inicio.linha;
  const linhaFim = selecao?.fim.linha;
  useEffect(() => {
    if (linhaInicio === undefined || linhaFim === undefined || alturaPainel === 0) return;
    const primeira = layoutLinhas.current[linhaInicio];
    const ultima = layoutLinhas.current[linhaFim];
    if (!primeira || !ultima) return;
    const fundoVisivel = scrollY.current + alturaArea - alturaPainel - FOLGA;
    if (ultima.y + ultima.altura > fundoVisivel) {
      rolarPara(ultima.y + ultima.altura - (alturaArea - alturaPainel) + FOLGA);
    } else if (primeira.y < scrollY.current) {
      rolarPara(primeira.y - FOLGA);
    }
  }, [linhaInicio, linhaFim, alturaPainel, alturaArea, rolarPara]);

  // Ao fechar o painel, a rolagem automática volta (ajuste durante o render).
  const painelAberto = selecao !== null;
  const [painelEstavaAberto, setPainelEstavaAberto] = useState(painelAberto);
  if (painelAberto !== painelEstavaAberto) {
    setPainelEstavaAberto(painelAberto);
    if (!painelAberto) setManual(false);
  }
  useEffect(() => {
    if (!painelAberto) clearTimeout(timerRetomar.current);
  }, [painelAberto]);

  useEffect(() => () => clearTimeout(timerRetomar.current), []);

  const retomarDepois = () => {
    clearTimeout(timerRetomar.current);
    timerRetomar.current = setTimeout(() => setManual(false), RETOMAR_APOS_MS);
  };

  const atualizarDirecao = (y: number) => {
    const alvo = yDaPosicao(posicao);
    if (alvo !== null) setDirecao(alvo < y ? 'cima' : 'baixo');
  };

  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    if (manual) atualizarDirecao(scrollY.current);
  };

  const onLayoutLinha = useCallback((linha: number, e: LayoutChangeEvent) => {
    const { x, y, height } = e.nativeEvent.layout;
    layoutLinhas.current[linha] = { x, y, altura: height };
  }, []);

  /** Retângulos das palavras de uma linha, nas coordenadas do conteúdo da rolagem. */
  const retangulosDaLinha = useCallback((linha: number): (Retangulo | undefined)[] | undefined => {
    const base = layoutLinhas.current[linha];
    const lista = layoutPalavras.current[linha];
    if (!base || !lista) return undefined;
    return lista.map((r) => r && { ...r, x: r.x + base.x, y: r.y + base.y });
  }, []);

  // As alças acompanham a seleção e o tamanho das palavras (ex.: a linha atual fica em negrito).
  // Medidas só existem depois do layout, então a posição é calculada no quadro seguinte.
  const posicionarAlcas = useCallback(() => {
    if (quadroPendente.current !== null) return;
    quadroPendente.current = requestAnimationFrame(() => {
      quadroPendente.current = null;
      const atual = selecaoAtual.current;
      const inicio = atual?.tipo === 'frase' ? retangulosDaLinha(atual.inicio.linha)?.[atual.inicio.palavra] : undefined;
      const fim = atual?.tipo === 'frase' ? retangulosDaLinha(atual.fim.linha)?.[atual.fim.palavra] : undefined;
      setAlcas(inicio && fim ? { inicio, fim } : null);
    });
  }, [retangulosDaLinha]);

  useEffect(() => {
    selecaoAtual.current = selecao;
    posicionarAlcas();
  }, [selecao, posicionarAlcas]);

  useEffect(() => () => {
    if (quadroPendente.current !== null) cancelAnimationFrame(quadroPendente.current);
  }, []);

  const onLayoutPalavra = useCallback(
    (linha: number, palavra: number, e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      (layoutPalavras.current[linha] ??= [])[palavra] = { x, y, largura: width, altura: height };
      if (selecaoAtual.current?.tipo === 'frase') posicionarAlcas();
    },
    [posicionarAlcas],
  );

  const moverAlcaPara = (alca: Alca, ponto: { x: number; y: number }) => {
    if (!selecao) return;
    const permitidas = linhasPermitidas(selecao, alca, palavras);
    const retangulos: ((Retangulo | undefined)[] | undefined)[] = [];
    for (const linha of permitidas) retangulos[linha] = retangulosDaLinha(linha);
    const alvo = palavraMaisProxima(retangulos, permitidas, ponto);
    if (!alvo) return;
    const nova = moverAlca(selecao, alca, alvo);
    if (nova.inicio.linha !== selecao.inicio.linha || nova.inicio.palavra !== selecao.inicio.palavra ||
        nova.fim.linha !== selecao.fim.linha || nova.fim.palavra !== selecao.fim.palavra) {
      onAlterarSelecao(nova);
    }
  };

  return (
    <View style={estilos.area} onLayout={(e) => setAlturaArea(e.nativeEvent.layout.height)}>
      <ScrollView
        ref={rolagem}
        accessibilityLabel="Letra da música"
        scrollEnabled={!arrastandoAlca}
        scrollEventThrottle={32}
        onScroll={aoRolar}
        onScrollBeginDrag={() => {
          clearTimeout(timerRetomar.current);
          setManual(true);
          atualizarDirecao(scrollY.current);
        }}
        onScrollEndDrag={retomarDepois}
        onMomentumScrollEnd={() => {
          if (manual) retomarDepois();
        }}
        onContentSizeChange={() => {
          if (fim && !manual && !selecao) rolagem.current?.scrollToEnd({ animated: !reduzirMovimento });
        }}
        contentContainerStyle={[
          estilos.conteudo,
          { paddingBottom: Math.max(24 + margemInferior, alturaPainel + FOLGA) },
        ]}
      >
        {marcadorNoTopo ? <LinhaInstrumental /> : null}
        {linhas.map((linha, i) =>
          palavras[i].length === 0 ? (
            <LinhaInstrumental key={i} onLayout={(e) => onLayoutLinha(i, e)} />
          ) : (
            <LinhaFaixa
              key={i}
              indice={i}
              palavras={palavras[i]}
              atual={i === destacada}
              selecao={selecao}
              onTocarPalavra={onTocarPalavra}
              onSegurarLinha={onSegurarLinha}
              onLayoutLinha={onLayoutLinha}
              onLayoutPalavra={onLayoutPalavra}
            />
          ),
        )}
        {fim ? <CardFim onVoltar={onVoltarAoAcervo} /> : null}
        {alcas && selecao?.tipo === 'frase' ? (
          <AlcasSelecao
            inicio={alcas.inicio}
            fim={alcas.fim}
            onMover={moverAlcaPara}
            onArrastando={setArrastandoAlca}
            onSoltar={onSoltarAlca}
          />
        ) : null}
      </ScrollView>
      {manual && !selecao ? (
        <BotaoVoltarLinha
          direcao={direcao}
          distanciaDoFundo={16 + margemInferior}
          onPress={() => {
            clearTimeout(timerRetomar.current);
            setManual(false);
          }}
        />
      ) : null}
    </View>
  );
}

type PropsFaixa = Omit<ComponentProps<typeof LinhaLetra>, 'selecaoInicio' | 'selecaoFim'> & {
  selecao: Selecao | null;
};

/** Passa à linha só a faixa selecionada dentro dela, para o memo não re-renderizar as outras linhas. */
function LinhaFaixa({ selecao, ...props }: PropsFaixa) {
  const faixa = faixaNaLinha(selecao, props.indice, props.palavras.length);
  return <LinhaLetra {...props} selecaoInicio={faixa?.[0] ?? -1} selecaoFim={faixa?.[1] ?? -1} />;
}

const estilos = StyleSheet.create({
  area: { flex: 1, minHeight: 0 },
  conteudo: { paddingTop: 12, paddingHorizontal: 16, gap: 6 },
});
