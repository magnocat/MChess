import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreboardManager } from '../src/storage/scoreboard.js';
import { formatTxtRecord } from '../src/storage/txtStorage.js';

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('ScoreboardManager (Mural Top 50 + Categorias)', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage();
  });

  it('preserva estatísticas antigas sem perder dados ao migrar para Mensal/Diário', () => {
    const legacyTxt = formatTxtRecord('SCOREBOARD', 'GLOBAL', {
      entries: [
        {
          shortId: 'abcd1234ef56',
          playerName: 'MiguelMagno',
          games: 10,
          moves: 240,
          wins: 7,
          losses: 2,
          draws: 1,
          points: 22,
          elo: 1120,
        },
      ],
    });
    globalThis.localStorage.setItem('mchess_scoreboard_txt', legacyTxt);

    const sb = new ScoreboardManager();
    expect(sb.getRanking('geral', 50)).toHaveLength(1);
    expect(sb.getRanking('geral', 50)[0].points).toBe(22);

    // Nova vitória soma no Geral, Mensal e Diário sem apagar os 22 pts antigos
    sb.recordResult({
      hwidHash: 'abcd1234ef567890',
      playerName: 'MiguelMagno',
      result: 'win',
      elo: 1140,
    });

    const geral = sb.getRanking('geral', 50);
    const mensal = sb.getRanking('mensal', 50);
    const diaria = sb.getRanking('diaria', 50);

    expect(geral[0].points).toBe(25);
    expect(mensal[0].points).toBe(3);
    expect(diaria[0].points).toBe(3);
  });

  it('mantém apenas o HWID quando não há Nick preenchido e limita Top 50', () => {
    const sb = new ScoreboardManager();
    sb.ensurePlayer({ hwidHash: '9988776655443322', playerName: '', elo: 800 });
    expect(sb.entries[0].playerName).toBe('998877665544');

    for (let i = 0; i < 60; i += 1) {
      sb.recordResult({
        hwidHash: `p${String(i).padStart(11, '0')}`,
        playerName: `Player${i}`,
        result: 'win',
        elo: 800 + i,
      });
    }

    expect(sb.getRanking('geral', 50)).toHaveLength(50);
  });
});
