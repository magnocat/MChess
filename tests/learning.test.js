import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectOpening, VERIFIED_PUZZLES } from '../src/learning/openingsAndPuzzles.js';

describe('Modo Aprendizado 2D (Aberturas e Puzzles)', () => {
  it('reconhece aberturas clássicas pela sequência SAN', () => {
    const it = detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    expect(it.name).toContain('Abertura Italiana');

    const sic = detectOpening(['e4', 'c5']);
    expect(sic.name).toContain('Defesa Siciliana');
  });

  it('valida que todos os puzzles táticos têm solução legal e correta', () => {
    for (const pz of VERIFIED_PUZZLES) {
      const chess = new Chess(pz.fen);
      const move = chess.move({ from: pz.solutionFrom, to: pz.solutionTo, promotion: 'q' });
      expect(move).not.toBeNull();
      if (pz.title.includes('Mate')) {
        expect(chess.isCheckmate()).toBe(true);
      } else {
        expect(chess.inCheck()).toBe(true);
      }
    }
  });
});
