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

## 3. Modo Especial (Finalizações) e Modo Leve

- O **Modo Especial** executa animações únicas de captura para cada combinação de peça atacante e defensora (como o coice do Cavalo na Rainha ou o salto esmagador no Peão).
- O **Modo Leve** desativa partículas, sombras pesadas, Modo Especial e Modo Animado para manter o desempenho em aparelhos simples.

## 4. Visualizador Stand Alone (Painel ADMIN)

No painel **ADMIN**, o botão **Visualizador de Peças (Stand Alone)** permite testar cada peça isolada com seleção de:

- Modelo (`animated` / `classic`)
- Peça (`k`, `q`, `b`, `n`, `r`, `p`) e Cor (`w` / `b`)
- Paleta de Daltonismo (`normal`, `protanopia`, `deuteranopia`, `tritanopia`, `achromatopsia`)
- Animação (`idle`, `moving`, `scared`, `attacking`, `victory`)
- Efeitos Especiais (`none`, `win`, `loss`, `draw`) e Finalizações contra qualquer alvo, com cópia rápida dos IDs.
