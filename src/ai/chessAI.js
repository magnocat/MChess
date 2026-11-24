import { Chess } from 'chess.js';

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Bônus posicional simples para incentivar controle do centro
const CENTER_BONUS = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, -10, -10, 10, 10, 5],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Avalia o tabuleiro do ponto de vista das Brancas (+ positivo, - negativo).
 * @param {Chess} chess
 * @param {boolean} aggressiveHuman
 */
function evaluateBoard(chess, aggressiveHuman = false) {
  if (chess.isGameOver()) {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -99999 : 99999;
    }
    return 0;
  }

  return evaluateMaterialAndPosition(chess, aggressiveHuman);
}

function evaluateMaterialAndPosition(chess, aggressiveHuman = false) {
  const board = chess.board();
  let total = 0;

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const base = PIECE_VALUES[piece.type] || 0;
      const posRow = piece.color === 'w' ? 7 - row : row;
      const bonus = piece.type === 'p' || piece.type === 'n' ? CENTER_BONUS[posRow][col] : 0;
      const safety = aggressiveHuman && piece.type === 'k' ? -10 : 0;
      const value = base + bonus + safety;
      total += piece.color === 'w' ? value : -value;
    }
  }

  return total;
}

function orderMoves(moves) {
  return moves.sort((a, b) => {
    const capA = a.captured ? (PIECE_VALUES[a.captured] || 100) - (PIECE_VALUES[a.piece] || 0) * 0.1 : 0;
    const capB = b.captured ? (PIECE_VALUES[b.captured] || 100) - (PIECE_VALUES[b.piece] || 0) * 0.1 : 0;
    const promoA = a.promotion ? 800 : 0;
    const promoB = b.promotion ? 800 : 0;
    return capB + promoB - (capA + promoA);
  });
}

function minimax(chess, depth, alpha, beta, maximizing, aggressiveHuman, state) {
  state.nodes += 1;
  if ((state.nodes & 63) === 0 && Date.now() >= state.deadline) {
    state.aborted = true;
    return evaluateMaterialAndPosition(chess, aggressiveHuman);
  }

  if (depth === 0) {
    if (chess.isCheck()) {
      return evaluateBoard(chess, aggressiveHuman);
    }
    return evaluateMaterialAndPosition(chess, aggressiveHuman);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) {
    if (chess.isCheck()) {
      return maximizing ? -99999 - depth : 99999 + depth;
    }
    return 0;
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, false, aggressiveHuman, state);
      chess.undo();
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha || state.aborted) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  for (const move of moves) {
    chess.move(move);
    const ev = minimax(chess, depth - 1, alpha, beta, true, aggressiveHuman, state);
    chess.undo();
    if (ev < minEval) minEval = ev;
    if (ev < beta) beta = ev;
    if (beta <= alpha || state.aborted) break;
  }
  return minEval;
}

/**
 * Escolhe o próximo lance legal da IA usando Minimax Alpha-Beta e o perfil adaptativo.
 * Limita o tempo de busca para evitar travamentos em celulares e PCs simples.
 * @param {string} fen
 * @param {object} adaptiveConfig
 * @returns {object|null}
 */
export function chooseAdaptiveMove(fen, adaptiveConfig = { depth: 2, mistakeChance: 0.25, aggressiveHuman: false }) {
  const chess = new Chess(fen);
  const legalMoves = orderMoves(chess.moves({ verbose: true }));
  if (legalMoves.length === 0) return null;

  // Se o perfil indicar chance de erro humano, escolhe entre os melhores lances aleatórios
  if (Math.random() < (adaptiveConfig.mistakeChance ?? 0.2)) {
    const poolSize = Math.min(legalMoves.length, 4);
    return legalMoves[Math.floor(Math.random() * poolSize)];
  }

  const maximizing = chess.turn() === 'w';
  const depth = Math.max(1, Math.min(3, adaptiveConfig.depth || 2));
  const state = { nodes: 0, deadline: Date.now() + 260, aborted: false };
  const scored = [];

  for (const move of legalMoves) {
    chess.move(move);
    const score = minimax(
      chess,
      depth - 1,
      -Infinity,
      Infinity,
      !maximizing,
      Boolean(adaptiveConfig.aggressiveHuman),
      state,
    );
    chess.undo();
    scored.push({ move, score });
    if (state.aborted) break;
  }

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  const bestScore = scored[0].score;
  const tied = scored.filter((item) => Math.abs(item.score - bestScore) <= 15);
  return tied[Math.floor(Math.random() * tied.length)].move;
}
