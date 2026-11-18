import { sanitizeText } from '../security/sanitizer.js';
import { formatTxtRecord } from './txtStorage.js';
import { parseSafeTxtPayload } from '../security/sanitizer.js';

const SCOREBOARD_KEY = 'mchess_scoreboard_txt';

/**
 * Gerencia o mural de pontuação dos jogadores humanos em texto puro (.txt).
 */
export class ScoreboardManager {
  constructor() {
    this.entries = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SCOREBOARD_KEY);
      if (!raw) return [];
      const parsed = parseSafeTxtPayload(raw);
      return Array.isArray(parsed.entries) ? parsed.entries : [];
    } catch {
      return [];
    }
  }

  save() {
    const txt = formatTxtRecord('SCOREBOARD', 'GLOBAL', { entries: this.entries });
    try {
      localStorage.setItem(SCOREBOARD_KEY, txt);
    } catch {
      // Ignora erro de armazenamento
    }
    return txt;
  }

  /**
   * Atualiza ou cria o registro do jogador humano no mural.
   * @param {object} params
   */
  recordResult({ hwidHash, playerName, result, elo }) {
    const shortId = sanitizeText(hwidHash, 64).slice(0, 12);
    const safeName = sanitizeText(playerName, 32) || 'Jogador';
    let entry = this.entries.find((item) => item.shortId === shortId);

    if (!entry) {
      entry = {
        shortId,
        playerName: safeName,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        elo: elo || 800,
        updatedAt: new Date().toISOString(),
      };
      this.entries.push(entry);
    }

    entry.playerName = safeName;
    if (result === 'win') {
      entry.wins += 1;
      entry.points += 3;
    } else if (result === 'loss') {
      entry.losses += 1;
    } else {
      entry.draws += 1;
      entry.points += 1;
    }
    if (Number.isFinite(elo)) {
      entry.elo = Math.round(elo);
    }
    entry.updatedAt = new Date().toISOString();

    this.entries.sort((a, b) => b.points - a.points || b.elo - a.elo);
    this.save();
    return entry;
  }

  getTopEntries(limit = 20) {
    return this.entries.slice(0, limit);
  }

  exportTxt() {
    return formatTxtRecord('SCOREBOARD', 'GLOBAL', { entries: this.entries });
  }

  clearAll() {
    this.entries = [];
    this.save();
  }

  removeByShortId(shortId) {
    this.entries = this.entries.filter((e) => e.shortId !== shortId);
    this.save();
  }
}
