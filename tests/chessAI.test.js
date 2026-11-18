import { describe, it, expect, beforeEach } from 'vitest';
import { ChessEngine } from '../src/core/chessEngine.js';
import { chooseAdaptiveMove } from '../src/ai/chessAI.js';
import { PlayerProfileManager } from '../src/ai/playerProfile.js';

describe('IA Adaptativa', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sempre retorna um lance legal', () => {
    const engine = new ChessEngine();
    const move = chooseAdaptiveMove(engine.getFen(), { depth: 2, mistakeChance: 0 });
    expect(move).not.toBeNull();
    const applied = engine.move(move.from, move.to, move.promotion || 'q');
    expect(applied).not.toBeNull();
  });

  it('evolui a dificuldade e o Elo conforme o jogador vence partidas', () => {
    const mgr = new PlayerProfileManager('abc1234567890abcdef1234567890abcdef');
    const initial = mgr.getAdaptiveConfig();
    expect(initial.depth).toBe(1);

    for (let i = 0; i < 6; i += 1) {
      mgr.recordHumanMove({ piece: 'p', san: 'e4' }, 2000, 1);
      mgr.recordMatchOutcome('win');
    }

    const evolved = mgr.getAdaptiveConfig();
    expect(evolved.depth).toBeGreaterThanOrEqual(2);
    expect(evolved.mistakeChance).toBeLessThan(initial.mistakeChance);
    expect(evolved.favoriteOpening).toBe('e4');
  });
});
