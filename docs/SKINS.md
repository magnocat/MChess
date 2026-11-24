# Skins, Modo Animado e Finalizações Especiais

Este documento descreve os modos visuais e a personalização de skins do **MChess 3D**.

## 1. Pasta de Skins (`public/skins/`)

Todas as peças do **Modo Animado** carregam suas texturas a partir de `public/skins/<cor>_<peca>.png` (ex.: `w_k.png` para Rei Branco e `b_q.png` para Rainha Preta) no formato **64×64 PNG**.

- **Rei (`k`):** Coroa real, capa, espada longa e barba.
- **Rainha (`q`):** Tiara com gema, capa, cetro e levitação suave.
- **Bispo (`b`):** Mitra, capa clerical, cajado mágico e levitação.
- **Cavalo (`n`):** Modelo 4 patas com sela, rédeas, crina, cauda e galope.
- **Torre (`r`):** Fortaleza com ameias, textura de tijolos e marcha sísmica.
- **Peão (`p`):** Soldado compacto com elmo, escudo e lança (sem capa).

Quando um perfil de daltonismo diferente de `normal` é ativado, o jogo aplica cores de alto contraste automaticamente.

## 2. Rótulos de Nome e Câmera Topo

- Cada peça exibe um balão com o nome (`Rei`, `Rainha`, `Bispo`, `Cavalo`, `Torre` ou `Peão`) acima da cabeça.
- Ao alternar para a câmera **Topo**, os nomes ficam ocultos para manter o tabuleiro limpo.

## 3. Modo Animado, Animals Game e Finalizações 3D

- **Modo Animado (`Skinview3D`):** Renderiza Rei, Rainha, Bispo e Peão como personagens articulados com caminhada ou voo no plano do tabuleiro. O Cavalo usa galope em 4 patas e a Torre usa marcha em tijolos de pedra. As peças ficam apoiadas direto no tabuleiro com um anel fino na base.
- **Modo Animals Game (Rigs IK):** Substitui as peças por animais com cinemática inversa (IK) inspirados no Wild Run 3D, no cenário **Campina Animal**:
  - **Rei (`k`):** Leão com juba, coroa e capa.
  - **Rainha (`q`):** Ovelha com tiara e capa.
  - **Torre (`r`):** Touro/Vaca com chifres e ameias.
  - **Bispo (`b`):** Porco com mitra e capa clerical.
  - **Cavalo (`n`):** Cavalo pinto com sela e galope IK.
  - **Peão (`p`):** Galinha com crista, barbela e bater de asas.
- **Modo Especial (Finalizações Battle Chess 3D):** Executa coreografias aleatórias de captura (3 variações por peça atacante: Peão, Cavalo, Torre, Bispo, Rainha e Rei) compatíveis com todos os modos visuais.
- **Modo Aprendizado 2D (Vista de Cima):** Oferece replay de partidas, análise de lances, biblioteca de aberturas, puzzles táticos e ensino interativo do movimento de cada peça.
- **Modo Leve:** Desativa partículas, sombras, Modo Especial, Modo Animado e Animals Game para manter alto FPS em celulares e PCs simples.

## 4. Visualizador Stand Alone (Painel ADMIN)

No painel **ADMIN**, o botão **Visualizador de Peças (Stand Alone)** permite testar cada peça isolada com seleção de:

- Modelo (`animated` / `classic`)
- Peça (`k`, `q`, `b`, `n`, `r`, `p`) e Cor (`w` / `b`)
- Paleta de Daltonismo (`normal`, `protanopia`, `deuteranopia`, `tritanopia`, `achromatopsia`)
- Animação (`idle`, `moving`, `scared`, `attacking`, `victory`)
- Efeitos Especiais (`none`, `win`, `loss`, `draw`) e Finalizações contra qualquer alvo, com cópia rápida dos IDs.
