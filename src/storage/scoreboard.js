import { parseSafeTxtPayload, sanitizeText } from '../security/sanitizer.js';
import { formatTxtRecord } from './txtStorage.js';

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
   * Garante que o jogador e seu Nick apareçam no mural imediatamente.
   */
  ensurePlayer({ hwidHash, playerName, elo, incrementGames = false }) {
    const shortId = sanitizeText(hwidHash, 64).slice(0, 12);
    const safeName = sanitizeText(playerName, 32) || 'Jogador';
    let entry = this.entries.find((item) => item.shortId === shortId);

    if (!entry) {
      entry = {
        shortId,
        playerName: safeName,
        games: 0,
        moves: 0,
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
    if (typeof entry.games !== 'number') entry.games = entry.wins + entry.losses + entry.draws;
    if (typeof entry.moves !== 'number') entry.moves = 0;
    if (incrementGames) entry.games += 1;
    if (Number.isFinite(elo)) entry.elo = Math.round(elo);
    entry.updatedAt = new Date().toISOString();

    this.sortAndSave();
    return entry;
  }

  /**
   * Registra cada lance executado pelo jogador no mural.
   */
  recordMove({ hwidHash, playerName, elo }) {
    const entry = this.ensurePlayer({ hwidHash, playerName, elo });
    entry.moves += 1;
    if (entry.games === 0) entry.games = 1;
    this.sortAndSave();
    return entry;
  }

  /**
   * Atualiza o placar ao finalizar uma partida.
   */
  recordResult({ hwidHash, playerName, result, elo }) {
    const entry = this.ensurePlayer({ hwidHash, playerName, elo });

    if (result === 'win') {
      entry.wins += 1;
      entry.points += 3;
    } else if (result === 'loss') {
      entry.losses += 1;
    } else {
      entry.draws += 1;
      entry.points += 1;
    }
    entry.games = Math.max(entry.games, entry.wins + entry.losses + entry.draws);
    if (Number.isFinite(elo)) {
      entry.elo = Math.round(elo);
    }
    entry.updatedAt = new Date().toISOString();

    this.sortAndSave();
    return entry;
  }

  sortAndSave() {
    this.entries.sort((a, b) => b.points - a.points || b.elo - a.elo || (b.moves || 0) - (a.moves || 0));
    this.save();
  }

  importTxt(rawText) {
    const parsed = parseSafeTxtPayload(rawText);
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Arquivo de mural inválido.');
    }
    for (const item of parsed.entries) {
      if (!item || !item.shortId) continue;
      const existing = this.entries.find((e) => e.shortId === item.shortId);
      if (!existing) {
        this.entries.push({
          shortId: sanitizeText(item.shortId, 16),
          playerName: sanitizeText(item.playerName, 32) || 'Jogador',
          games: Number(item.games) || 0,
          moves: Number(item.moves) || 0,
          wins: Number(item.wins) || 0,
          losses: Number(item.losses) || 0,
          draws: Number(item.draws) || 0,
          points: Number(item.points) || 0,
          elo: Number(item.elo) || 800,
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      }
    }
    this.sortAndSave();
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
