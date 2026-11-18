import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreateHwidHash, computeSha256 } from '../src/storage/hwid.js';
import { saveMatchTxt, loadMatchTxt } from '../src/storage/txtStorage.js';
import { ScoreboardManager } from '../src/storage/scoreboard.js';
import { GameState } from '../src/core/gameState.js';

describe('Persistência em Texto Puro (.txt) e HWID', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gera hash SHA-256 de 64 caracteres para o HWID', async () => {
    const hash = await getOrCreateHwidHash();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const sha = await computeSha256('teste');
    expect(sha).toHaveLength(64);
  });

  it('salva e restaura uma partida em formato .txt sem banco de dados', () => {
    const hwid = 'a'.repeat(64);
    const gs = new GameState();
    gs.startNew({ mode: '1vIA', seed: 777111, playerName: 'Miguel Magno' });
    gs.engine.moveByNotation('e4');

    const txt = saveMatchTxt(hwid, gs.serialize(hwid));
    expect(txt).toContain('TIPO=MATCH');
    expect(txt).toContain(`HWID_HASH=${hwid}`);

    const loaded = loadMatchTxt(hwid);
    expect(loaded).not.toBeNull();
    expect(loaded.seed).toBe(777111);

    const restored = new GameState();
    restored.restore(loaded);
    expect(restored.engine.getHistory(false)).toEqual(['e4']);
  });

  it('registra pontuação no mural em .txt', () => {
    const sb = new ScoreboardManager();
    sb.recordResult({ hwidHash: 'b'.repeat(64), playerName: 'Miguel', result: 'win', elo: 920 });
    const top = sb.getTopEntries(5);
    expect(top).toHaveLength(1);
    expect(top[0].points).toBe(3);
    expect(sb.exportTxt()).toContain('TIPO=SCOREBOARD');
  });
});
