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
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw()) {
    return 0;
  }

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
    const scoreA = (a.captured ? 10 : 0) + (a.san.includes('+') ? 5 : 0);
    const scoreB = (b.captured ? 10 : 0) + (b.san.includes('+') ? 5 : 0);
    return scoreB - scoreA;
  });
}

function minimax(chess, depth, alpha, beta, maximizing, aggressiveHuman) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess, aggressiveHuman);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, false, aggressiveHuman);
      chess.undo();
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  for (const move of moves) {
    chess.move(move);
    const ev = minimax(chess, depth - 1, alpha, beta, true, aggressiveHuman);
    chess.undo();
    if (ev < minEval) minEval = ev;
    if (ev < beta) beta = ev;
    if (beta <= alpha) break;
  }
  return minEval;
}

/**
 * Escolhe o próximo lance legal da IA usando Minimax Alpha-Beta e o perfil adaptativo.
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
    );
    chess.undo();
    scored.push({ move, score });
  }

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  const bestScore = scored[0].score;
  const tied = scored.filter((item) => Math.abs(item.score - bestScore) <= 15);
  return tied[Math.floor(Math.random() * tied.length)].move;
}
