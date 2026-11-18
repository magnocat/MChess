import { describe, it, expect } from 'vitest';
import { ChessEngine } from '../src/core/chessEngine.js';

describe('ChessEngine (Regras Oficiais)', () => {
  it('rejeita movimentos ilegais e aceita movimentos legais', () => {
    const engine = new ChessEngine();
    expect(engine.move('e2', 'e5')).toBeNull();
    const move = engine.move('e2', 'e4');
    expect(move).not.toBeNull();
    expect(move.san).toBe('e4');
  });

  it('detecta xeque-mate corretamente (Mate do Louco)', () => {
    const engine = new ChessEngine();
    engine.moveByNotation('f3');
    engine.moveByNotation('e5');
    engine.moveByNotation('g4');
    engine.moveByNotation('Qh4');
    const status = engine.getStatus();
    expect(status.isGameOver).toBe(true);
    expect(status.outcome).toBe('checkmate');
    expect(status.winner).toBe('b');
  });

  it('suporta roque curto, en passant e promoção de peão', () => {
    // Roque curto
    const castle = new ChessEngine('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const roque = castle.move('e1', 'g1');
    expect(roque).not.toBeNull();
    expect(roque.san).toBe('O-O');

    // En passant
    const ep = new ChessEngine('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    const epMove = ep.move('e5', 'd6');
    expect(epMove).not.toBeNull();
    expect(epMove.captured).toBe('p');

    // Promoção
    const promo = new ChessEngine('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
    const promoMove = promo.move('e7', 'e8', 'q');
    expect(promoMove).not.toBeNull();
    expect(promoMove.promotion).toBe('q');
  });
});
