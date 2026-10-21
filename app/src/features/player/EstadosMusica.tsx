import { AlertCircle, VideoOff, WifiOff } from 'lucide-react-native';

import { Botao } from '@/components/Botao';
import { EstadoMensagem } from '@/components/EstadoMensagem';
import { LetraEsqueleto } from '@/features/letra/Marcadores';

import { PlayerBloqueado, PlayerCarregando } from './AreaDoPlayer';

/** Tela 09: vídeo e letra carregando. */
export function MusicaCarregando({ alturaPlayer }: { alturaPlayer: number }) {
  return (
    <>
      <PlayerCarregando altura={alturaPlayer} />
      <LetraEsqueleto />
    </>
  );
}

/** Tela 11: vídeo removido, bloqueado ou sem incorporação — e também a música tirada do ar (404). */
export function MusicaIndisponivel({ alturaPlayer, onVoltar }: { alturaPlayer: number; onVoltar: () => void }) {
  return (
    <>
      <PlayerBloqueado altura={alturaPlayer} Icone={VideoOff} texto="Vídeo indisponível" />
      <EstadoMensagem
        variante="musica"
        alerta
        Icone={AlertCircle}
        tom="erro"
        titulo="Música indisponível no momento"
        texto="O vídeo foi removido ou não pode ser exibido no app. Escolha outra música do acervo."
      >
        <Botao titulo="Voltar ao acervo" largo onPress={onVoltar} />
      </EstadoMensagem>
    </>
  );
}

type PropsTentar = { alturaPlayer: number; onTentarDeNovo: () => void; onVoltar: () => void };

/** Tela 12: a música foi aberta sem conexão. */
export function MusicaSemConexao({ alturaPlayer, onTentarDeNovo, onVoltar }: PropsTentar) {
  return (
    <>
      <PlayerBloqueado altura={alturaPlayer} Icone={WifiOff} texto="Sem conexão" />
      <EstadoMensagem
        variante="musica"
        alerta
        Icone={WifiOff}
        tom="erro"
        titulo="Você está sem conexão"
        texto="Conecte-se à internet para carregar o vídeo e a letra."
      >
        <Botao titulo="Tentar de novo" largo onPress={onTentarDeNovo} />
        <Botao titulo="Voltar ao acervo" variante="texto" largo onPress={onVoltar} />
      </EstadoMensagem>
    </>
  );
}

/** Erro da API ao abrir a música (decisão do plano: layout da tela 12 com ícone de alerta). */
export function MusicaErro({ alturaPlayer, onTentarDeNovo, onVoltar }: PropsTentar) {
  return (
    <>
      <PlayerBloqueado altura={alturaPlayer} Icone={AlertCircle} texto="Erro ao carregar" />
      <EstadoMensagem
        variante="musica"
        alerta
        Icone={AlertCircle}
        tom="erro"
        titulo="Não foi possível carregar a música"
        texto="Algo deu errado do nosso lado. Tente de novo em instantes."
      >
        <Botao titulo="Tentar de novo" largo onPress={onTentarDeNovo} />
        <Botao titulo="Voltar ao acervo" variante="texto" largo onPress={onVoltar} />
      </EstadoMensagem>
    </>
  );
}
