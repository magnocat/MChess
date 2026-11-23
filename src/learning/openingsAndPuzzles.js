/**
 * Banco de aberturas reconhecidas, quebra-cabeças táticos e guias de peças
 * para o Modo Aprendizado (2D) inspirado no RoChess.
 */

export const OPENING_BOOK = [
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], name: 'Abertura Italiana (C50)', tip: 'Desenvolve o bispo mirando o ponto fraco f7.' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], name: 'Ruy Lopez / Espanhola (C60)', tip: 'Pressiona o cavalo que defende o peão de e5.' },
  { moves: ['e4', 'e5', 'Nf3', 'Nf6'], name: 'Defesa Petrov (C42)', tip: 'Contra-ataque simétrico sólido no centro.' },
  { moves: ['e4', 'e5', 'Bc4'], name: 'Abertura do Bispo (C23)', tip: 'Ataque rápido ao centro e à casa f7.' },
  { moves: ['e4', 'e5', 'f4'], name: 'Gambito do Rei (C30)', tip: 'Sacrifica um peão para abrir a coluna f e ganhar iniciativa.' },
  { moves: ['e4', 'c5'], name: 'Defesa Siciliana (B20)', tip: 'Luta assimétrica pelo controle da casa central d4.' },
  { moves: ['e4', 'e6'], name: 'Defesa Francesa (C00)', tip: 'Estrutura sólida preparando d5 para desafiar o centro.' },
  { moves: ['e4', 'c6'], name: 'Defesa Caro-Kann (B10)', tip: 'Apoia d5 mantendo o bispo de c8 livre.' },
  { moves: ['e4', 'd5'], name: 'Defesa Escandinava (B01)', tip: 'Desafia imediatamente o peão central de e4.' },
  { moves: ['d4', 'd5', 'c4'], name: 'Gambito da Dama (D06)', tip: 'Oferece o peão de c4 para dominar o centro com e4.' },
  { moves: ['d4', 'd5', 'Bf4'], name: 'Sistema Londres (D02)', tip: 'Desenvolvimento sólido e fácil de aprender.' },
  { moves: ['d4', 'Nf6', 'c4', 'g6'], name: 'Defesa Índia do Rei (E60)', tip: 'Fianqueto dinâmico preparando contra-ataque.' },
  { moves: ['d4', 'Nf6', 'c4', 'e6'], name: 'Defesa Índia / Nimzo-Índia (E20)', tip: 'Controle flexível das casas centrais.' },
  { moves: ['c4'], name: 'Abertura Inglesa (A10)', tip: 'Controla d5 pelo flanco com jogo posicional.' },
  { moves: ['Nf3'], name: 'Abertura Réti (A04)', tip: 'Desenvolvimento hipermoderno controlando o centro à distância.' },
];

export function detectOpening(historySan) {
  if (!Array.isArray(historySan) || historySan.length === 0) {
    return { name: 'Posição Inicial', tip: 'Controle o centro (e4, d4) e desenvolva cavalos e bispos.' };
  }
  let best = null;
  for (const op of OPENING_BOOK) {
    if (historySan.length >= op.moves.length) {
      const match = op.moves.every((m, idx) => historySan[idx] === m);
      if (match && (!best || op.moves.length > best.moves.length)) {
        best = op;
      }
    }
  }
  return best || { name: 'Jogo Livre / Meio-Jogo', tip: 'Proteja o Rei e conecte as Torres.' };
}

export const VERIFIED_PUZZLES = [
  {
    id: 'pz-1',
    title: 'Mate do Corredor (Mate em 1)',
    difficulty: 'Iniciante',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    solutionFrom: 'a1',
    solutionTo: 'a8',
    hint: 'Leve a Torre até a última fileira onde está o Rei preto.',
    explanation: 'Ta8# é xeque-mate imediato. Os três peões impedem o Rei preto de escapar.',
  },
  {
    id: 'pz-2',
    title: 'Mate de Rainha Apoiada (Mate em 1)',
    difficulty: 'Iniciante',
    fen: '6k1/5ppp/5B2/8/8/8/6Q1/6K1 w - - 0 1',
    solutionFrom: 'g2',
    solutionTo: 'g7',
    hint: 'O Bispo em f6 protege a casa g7. Ataque o Rei de frente com a Rainha.',
    explanation: 'Dxg7# é xeque-mate porque o Bispo em f6 defende a Rainha em g7.',
  },
  {
    id: 'pz-3',
    title: 'Mate do Pastor (Mate em 1)',
    difficulty: 'Iniciante',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solutionFrom: 'h5',
    solutionTo: 'f7',
    hint: 'O peão de f7 está atacado pela Rainha e pelo Bispo.',
    explanation: 'Dxf7# é o clássico Mate do Pastor. O Bispo em c4 protege a Rainha.',
  },
  {
    id: 'pz-4',
    title: 'Garfo de Cavalo no Rei e Rainha',
    difficulty: 'Intermediário',
    fen: '4k3/3q4/8/8/4N3/8/8/4K3 w - - 0 1',
    solutionFrom: 'e4',
    solutionTo: 'f6',
    hint: 'Salte com o Cavalo dando xeque no Rei e atacando a Rainha ao mesmo tempo.',
    explanation: 'Cf6+ cria um garfo duplo perfeito no Rei (e8) e na Rainha (d7).',
  },
  {
    id: 'pz-5',
    title: 'Mate de Torre e Rei',
    difficulty: 'Iniciante',
    fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1',
    solutionFrom: 'a1',
    solutionTo: 'a8',
    hint: 'Seu Rei em e6 já bloqueia as casas de fuga d7, e7 e f7.',
    explanation: 'Ta8# fecha a oitava fileira e aplica xeque-mate com apoio do Rei.',
  },
];

export const PIECE_TEACHING_GUIDE = {
  p: {
    name: 'Peão',
    value: '1 ponto',
    summary: 'Avança 1 casa para frente (ou 2 casas no primeiro lance). Captura na diagonal.',
    tip: 'Ao chegar à última fileira, o Peão promove para Rainha, Torre, Bispo ou Cavalo.',
  },
  n: {
    name: 'Cavalo',
    value: '3 pontos',
    summary: 'Move-se em formato de "L" (2 casas + 1 casa ao lado). Única peça que salta outras peças.',
    tip: 'Use o Cavalo no centro do tabuleiro para fazer garfos em duas peças.',
  },
  b: {
    name: 'Bispo',
    value: '3 pontos',
    summary: 'Move-se em qualquer distância nas diagonais. Cada Bispo fica sempre na mesma cor de casa.',
    tip: 'Mantenha o par de Bispos ativo em diagonais abertas.',
  },
  r: {
    name: 'Torre',
    value: '5 pontos',
    summary: 'Move-se em linhas retas (horizontais e verticais) por qualquer número de casas livres.',
    tip: 'Coloque as Torres em colunas abertas e conecte-as após o roque.',
  },
  q: {
    name: 'Rainha',
    value: '9 pontos',
    summary: 'Combina os movimentos da Torre e do Bispo (linhas retas e diagonais).',
    tip: 'Evite expor a Rainha muito cedo na abertura para não perder tempo fugindo.',
  },
  k: {
    name: 'Rei',
    value: 'Peça Principal',
    summary: 'Move-se 1 casa em qualquer direção. Nunca pode ir para uma casa atacada.',
    tip: 'Faça o roque cedo para proteger o Rei atrás dos peões.',
  },
};
