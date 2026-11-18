import { Chess } from 'chess.js';
import { isValidPromotion, isValidSquare } from '../security/sanitizer.js';

/**
 * Motor oficial de xadrez baseado em chess.js.
 * Atua como única fonte de verdade para todas as regras.
 */
export class ChessEngine {
  constructor(fen = null) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  reset() {
    this.chess.reset();
  }

  loadFen(fen) {
    this.chess.load(fen);
    return true;
  }

  loadPgn(pgn) {
    this.chess.loadPgn(pgn);
    return true;
  }

  getFen() {
    return this.chess.fen();
  }

  getPgn() {
    return this.chess.pgn();
  }

  getTurn() {
    return this.chess.turn(); // 'w' ou 'b'
  }

  getBoard() {
    return this.chess.board();
  }

  getPieceAt(square) {
    if (!isValidSquare(square)) return null;
    return this.chess.get(square);
  }

  /**
   * Lista os movimentos legais, opcionalmente filtrados por casa de origem.
   * @param {string|null} square
   */
  getLegalMoves(square = null) {
    if (square && !isValidSquare(square)) return [];
    return this.chess.moves({ square: square || undefined, verbose: true });
  }

  /**
   * Executa um movimento a partir de origem e destino.
   * @param {string} from
   * @param {string} to
   * @param {string} promotion
   */
  move(from, to, promotion = 'q') {
    if (!isValidSquare(from) || !isValidSquare(to)) {
      return null;
    }
    const safePromo = isValidPromotion(promotion) ? promotion : 'q';
    try {
      return this.chess.move({ from, to, promotion: safePromo });
    } catch {
      return null;
    }
  }

  /**
   * Executa um movimento em notação SAN ou UCI (ex: "e4" ou "e2e4").
   * @param {string} notation
   */
  moveByNotation(notation) {
    if (typeof notation !== 'string') return null;
    const clean = notation.trim();
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(clean)) {
      const from = clean.slice(0, 2);
      const to = clean.slice(2, 4);
      const promo = clean.slice(4, 5) || 'q';
      return this.move(from, to, promo);
    }
    try {
      return this.chess.move(clean);
    } catch {
      return null;
    }
  }

  undo() {
    return this.chess.undo();
  }

  getHistory(verbose = false) {
    return this.chess.history({ verbose });
  }

  isCheck() {
    return this.chess.inCheck();
  }

  isCheckmate() {
    return this.chess.isCheckmate();
  }

  isStalemate() {
    return this.chess.isStalemate();
  }

  isThreefoldRepetition() {
    return this.chess.isThreefoldRepetition();
  }

  isInsufficientMaterial() {
    return this.chess.isInsufficientMaterial();
  }

  isDraw() {
    return this.chess.isDraw();
  }

  isGameOver() {
    return this.chess.isGameOver();
  }

  /**
   * Retorna o estado completo e estruturado da partida.
   */
  getStatus() {
    let outcome = 'ongoing';
    let winner = null;
    if (this.isCheckmate()) {
      outcome = 'checkmate';
      winner = this.getTurn() === 'w' ? 'b' : 'w';
    } else if (this.isStalemate()) {
      outcome = 'stalemate';
    } else if (this.isThreefoldRepetition()) {
      outcome = 'threefold_repetition';
    } else if (this.isInsufficientMaterial()) {
      outcome = 'insufficient_material';
    } else if (this.isDraw()) {
      outcome = 'draw';
    }

    return {
      fen: this.getFen(),
      pgn: this.getPgn(),
      turn: this.getTurn(),
      inCheck: this.isCheck(),
      isGameOver: this.isGameOver(),
      outcome,
      winner,
      historySan: this.getHistory(false),
      moveCount: this.getHistory(false).length,
    };
  }
}
