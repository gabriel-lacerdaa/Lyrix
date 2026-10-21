# Lyrix · Funcionalidades do MVP: base para o design das telas

## Resumo do produto
App mobile (Android e iOS) para **estudar inglês com músicas**:

1. O usuário escolhe **uma música do acervo**.
2. A música toca no **player do YouTube**, que fica visível na tela.
3. O usuário acompanha a **letra sincronizada**.
4. O usuário toca numa **palavra** ou seleciona uma **frase curta** para ver a tradução.

**Fora do MVP:**
- biblioteca do usuário;
- fila ou sequência de músicas;
- busca livre no YouTube;
- tradução da letra inteira;
- anúncios e assinatura.

---

## Funcionalidades

### F1. Acervo de músicas
- **O que faz:** mostra as músicas disponíveis. São só as do acervo curado, cadastradas e revisadas pelo responsável do projeto.
- **O que o usuário vê:** a lista de músicas, com **título** e **artista** de cada uma.
- **O que o usuário pode fazer:** escolher **uma música** para abrir a tela da música.
- **A definir:**
  - se haverá busca ou filtro dentro do acervo;
  - se o nível de inglês da música (CEFR) aparece;
  - a ordenação;
  - se há capa ou miniatura.

### F2. Reprodução no player do YouTube
- **O que faz:** toca o vídeo da música escolhida no player oficial do YouTube, dentro do app.
- **O que o usuário vê:** o **player do YouTube visível**, com os controles próprios do YouTube.
- **O que o usuário pode fazer:** tocar, pausar e avançar ou voltar pelos controles do player.
- **Restrições de layout:**
  - **Nada pode ficar sobreposto ao player.**
  - O player precisa ter **no mínimo 200×200 px** (16:9 recomendado).
  - A letra fica **fora** da área do player (por exemplo, abaixo).
- **Comportamentos:**
  - Se o app for para **segundo plano**, a música **pausa**.
  - **Anúncios do YouTube** podem aparecer antes ou durante o vídeo, e o app não pode bloqueá-los. Como a letra se comporta durante um anúncio: **a definir** (sugestão: esconder ou congelar o destaque).

### F3. Letra sincronizada
- **O que faz:** mostra a letra completa da música e **destaca a linha que está sendo cantada**, acompanhando o vídeo do começo ao fim sem perder a sincronia.
- **O que o usuário vê:**
  - a letra em linhas, abaixo do player;
  - a **linha atual destacada**;
  - nos **trechos instrumentais**, nenhuma linha destacada.
- **O que o usuário pode fazer:** ler e rolar a letra.
- **Granularidade:** **por linha** no MVP. O destaque por palavra (karaokê) **não** entra.
- **A definir:**
  - **rolagem automática** até a linha atual, e o que acontece quando o usuário rola manualmente (por exemplo, voltar a acompanhar depois de alguns segundos);
  - o estilo visual do destaque.

### F4. Tradução de palavra
- **O que faz:** mostra a tradução para o português **só da palavra tocada**.
- **O que o usuário vê:** um painel com a **palavra** e a **tradução**.
- **O que o usuário pode fazer:** **tocar em qualquer palavra** da letra para abrir o painel, e fechá-lo.
- **A definir:**
  - o formato do painel (por exemplo, um painel que sobe de baixo, sem cobrir o player);
  - se mostra a classe gramatical e um exemplo;
  - se a música **pausa** ao abrir a tradução;
  - o estado de "carregando" e de erro.

### F5. Tradução de frase
- **O que faz:** mostra a tradução para o português **só da frase curta selecionada**. **Nunca da letra inteira.**
- **O que o usuário vê:** o **trecho selecionado** e a **tradução** dele.
- **O que o usuário pode fazer:** **selecionar uma frase curta** e ver a tradução.
- **A definir:**
  - o gesto de seleção (por exemplo, toque longo numa linha ou arrastar sobre várias palavras);
  - o tamanho máximo da seleção (uma linha ou poucas linhas);
  - se usa o mesmo painel da F4;
  - se a música pausa.

---

## Estados que o design precisa prever
- **Acervo carregando, vazio ou com erro de conexão.**
- **Vídeo indisponível:** vídeo removido, bloqueado no país ou com a incorporação desativada. Mensagem de "música indisponível no momento" (texto **a definir**).
- **Anúncio do YouTube tocando:** comportamento da letra **a definir**.
- **Tradução carregando ou com erro.**
- **Música terminada:** o que aparece ao final (por exemplo, voltar ao acervo) **a definir**. Não há próxima música automática, porque não há fila no MVP.

## Itens discutidos, ainda sem decisão de entrar no MVP (a definir)
- **Ajuste de atraso do áudio:** para fones Bluetooth, que atrasam o som em ~100–300 ms. Seria uma opção "a letra está adiantada/atrasada".
- **Velocidade de reprodução:** ouvir mais devagar (a API do YouTube permite de 0,25× a 2×).
- **Login do usuário.**
- **Tela de configurações:** só existiria se algum dos itens acima entrar.

---

## Telas previstas
1. **Acervo**, a tela inicial: lista de músicas (F1).
2. **Música**: player do YouTube no topo e letra sincronizada abaixo (F2, F3), com acesso às traduções (F4, F5).
3. **Painel de tradução**: sobreposto à tela da música, **sem cobrir o player**. Mostra a tradução da palavra (F4) ou da frase (F5).
4. **Configurações** (*a definir*): só se o ajuste de atraso, a velocidade ou o login entrarem no MVP.

## Fluxo de navegação

```
[Acervo] --escolhe uma música--> [Música: player + letra]
                                    |  toca numa palavra / seleciona frase
                                    v
                             [Painel de tradução] --fechar--> [Música]
[Música] --voltar--> [Acervo]
[Música] --música termina--> (comportamento a definir)
```

- O usuário sempre trabalha com **uma música por vez**. Para ouvir outra, volta ao **Acervo** e escolhe de novo.
