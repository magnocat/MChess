import { loadProfileTxt, saveProfileTxt } from '../storage/txtStorage.js';

/**
 * Cria um perfil inicial acessível para novos jogadores.
 */
export function createDefaultProfile(hwidHash) {
  return {
    hwidHash,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    elo: 800,
    totalMoves: 0,
    avgMoveTimeMs: 4000,
    openingCounts: {},
    pieceUsage: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    captureRate: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Gerencia o aprendizado estatístico da IA com base no histórico do jogador.
 */
export class PlayerProfileManager {
  constructor(hwidHash) {
    this.hwidHash = hwidHash;
    this.profile = loadProfileTxt(hwidHash) || createDefaultProfile(hwidHash);
  }

  setHwid(hwidHash) {
    this.hwidHash = hwidHash;
    this.profile = loadProfileTxt(hwidHash) || createDefaultProfile(hwidHash);
  }

  /**
   * Registra cada lance humano para adaptar a estratégia da IA.
   * @param {object} moveObj - Lance retornado por chess.js
   * @param {number} moveTimeMs
   * @param {number} plyCount
   */
  recordHumanMove(moveObj, moveTimeMs = 3000, plyCount = 1) {
    if (!moveObj) return;
    const p = this.profile;
    p.totalMoves += 1;
    p.avgMoveTimeMs = Math.round((p.avgMoveTimeMs * (p.totalMoves - 1) + moveTimeMs) / p.totalMoves);

    if (moveObj.piece && p.pieceUsage[moveObj.piece] !== undefined) {
      p.pieceUsage[moveObj.piece] += 1;
    }

    if (plyCount <= 2 && moveObj.san) {
      p.openingCounts[moveObj.san] = (p.openingCounts[moveObj.san] || 0) + 1;
    }

    if (moveObj.captured) {
      p.captureRate = Number(((p.captureRate * (p.totalMoves - 1) + 1) / p.totalMoves).toFixed(3));
    } else {
      p.captureRate = Number(((p.captureRate * (p.totalMoves - 1)) / p.totalMoves).toFixed(3));
    }

    p.updatedAt = new Date().toISOString();
    saveProfileTxt(this.hwidHash, p);
  }

  /**
   * Atualiza o Elo e o placar ao fim da partida contra a IA.
   * @param {'win'|'loss'|'draw'} result
   */
  recordMatchOutcome(result) {
    const p = this.profile;
    p.gamesPlayed += 1;
    const aiElo = this.getAdaptiveConfig().aiElo;
    const expected = 1 / (1 + 10 ** ((aiElo - p.elo) / 400));
    let score = 0.5;

    if (result === 'win') {
      p.wins += 1;
      score = 1;
    } else if (result === 'loss') {
      p.losses += 1;
      score = 0;
    } else {
      p.draws += 1;
    }

    p.elo = Math.max(400, Math.round(p.elo + 32 * (score - expected)));
    p.updatedAt = new Date().toISOString();
    saveProfileTxt(this.hwidHash, p);
    return p;
  }

  /**
   * Calcula profundidade e taxa de imprecisão da IA de forma progressiva.
   * Nas primeiras partidas a IA joga leve para permitir aprendizado e vitórias.
   */
  getAdaptiveConfig() {
    const p = this.profile;
    const winRatio = p.gamesPlayed > 0 ? p.wins / p.gamesPlayed : 0.5;

    let depth = 1;
    let mistakeChance = 0.42;

    if (p.gamesPlayed >= 2 || p.elo >= 850) {
      depth = 2;
      mistakeChance = 0.28;
    }
    if (p.gamesPlayed >= 5 || p.elo >= 980) {
      depth = 2;
      mistakeChance = 0.16;
    }
    if (p.gamesPlayed >= 10 || p.elo >= 1120) {
      depth = 3;
      mistakeChance = 0.08;
    }
    if (p.gamesPlayed >= 20 && winRatio > 0.6) {
      depth = 3;
      mistakeChance = 0.02;
    }

    const aiElo = 700 + depth * 180 - Math.round(mistakeChance * 300);

    return {
      depth,
      mistakeChance,
      aiElo,
      favoriteOpening: this.getFavoriteOpening(),
      aggressiveHuman: p.captureRate > 0.22,
    };
  }

  getFavoriteOpening() {
    const entries = Object.entries(this.profile.openingCounts || {});
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  exportTxt() {
    return saveProfileTxt(this.hwidHash, this.profile);
  }
}
