import { parseSafeTxtPayload, sanitizeText } from '../security/sanitizer.js';
import { formatTxtRecord } from './txtStorage.js';

const SCOREBOARD_KEY = 'mchess_scoreboard_txt';

function getCurrentMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

function getCurrentDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function createPeriodBucket(key) {
  return { key, points: 0, wins: 0, losses: 0, draws: 0, games: 0, moves: 0 };
}

/**
 * Gerencia o mural de pontuação dos jogadores humanos em texto puro (.txt).
 * Mantém histórico Geral, Mensal e Diário sem afetar estatísticas já salvas.
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

  ensurePeriodBuckets(entry) {
    const monthKey = getCurrentMonthKey();
    const dayKey = getCurrentDayKey();
    if (!entry.monthly || entry.monthly.key !== monthKey) {
      entry.monthly = createPeriodBucket(monthKey);
    }
    if (!entry.daily || entry.daily.key !== dayKey) {
      entry.daily = createPeriodBucket(dayKey);
    }
  }

  /**
   * Garante que o jogador apareça no mural imediatamente.
   * Se não houver Nick preenchido, mantém apenas o HWID (shortId).
   */
  ensurePlayer({ hwidHash, playerName, elo, incrementGames = false }) {
    const shortId = sanitizeText(hwidHash, 64).slice(0, 12);
    const cleanNick = sanitizeText(playerName, 32);
    const safeName = cleanNick && cleanNick !== 'Anônimo' ? cleanNick : shortId;
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
        monthly: createPeriodBucket(getCurrentMonthKey()),
        daily: createPeriodBucket(getCurrentDayKey()),
        updatedAt: new Date().toISOString(),
      };
      this.entries.push(entry);
    }

    if (cleanNick && cleanNick !== 'Anônimo') {
      entry.playerName = cleanNick;
    } else if (!entry.playerName) {
      entry.playerName = shortId;
    }

    if (typeof entry.games !== 'number') entry.games = entry.wins + entry.losses + entry.draws;
    if (typeof entry.moves !== 'number') entry.moves = 0;
    this.ensurePeriodBuckets(entry);

    if (incrementGames) {
      entry.games += 1;
      entry.monthly.games += 1;
      entry.daily.games += 1;
    }
    if (Number.isFinite(elo)) entry.elo = Math.round(elo);
    entry.updatedAt = new Date().toISOString();

    this.sortAndSave();
    if (incrementGames) {
      this.pushToRemoteEndpoint();
    }
    return entry;
  }

  /**
   * Registra cada lance executado pelo jogador no mural (Geral, Mensal e Diário).
   */
  recordMove({ hwidHash, playerName, elo }) {
    const entry = this.ensurePlayer({ hwidHash, playerName, elo });
    this.ensurePeriodBuckets(entry);
    entry.moves += 1;
    entry.monthly.moves += 1;
    entry.daily.moves += 1;
    if (entry.games === 0) entry.games = 1;
    if (entry.monthly.games === 0) entry.monthly.games = 1;
    if (entry.daily.games === 0) entry.daily.games = 1;
    this.sortAndSave();
    return entry;
  }

  /**
   * Atualiza o placar ao finalizar uma partida (Geral, Mensal e Diário).
   */
  recordResult({ hwidHash, playerName, result, elo }) {
    const entry = this.ensurePlayer({ hwidHash, playerName, elo });
    this.ensurePeriodBuckets(entry);

    const applyOutcome = (target) => {
      if (result === 'win') {
        target.wins += 1;
        target.points += 3;
      } else if (result === 'loss') {
        target.losses += 1;
      } else {
        target.draws += 1;
        target.points += 1;
      }
      target.games = Math.max(target.games, target.wins + target.losses + target.draws);
    };

    applyOutcome(entry);
    applyOutcome(entry.monthly);
    applyOutcome(entry.daily);

    if (Number.isFinite(elo)) {
      entry.elo = Math.round(elo);
    }
    entry.updatedAt = new Date().toISOString();

    this.sortAndSave();
    this.pushToRemoteEndpoint();
    return entry;
  }

  sortAndSave() {
    this.entries.sort((a, b) => b.points - a.points || b.elo - a.elo || (b.moves || 0) - (a.moves || 0));
    this.save();
  }

  mergeEntries(entries) {
    if (!Array.isArray(entries)) return;
    for (const item of entries) {
      if (!item || !item.shortId) continue;
      const cleanId = sanitizeText(item.shortId, 16);
      const existing = this.entries.find((e) => e.shortId === cleanId);
      if (!existing) {
        this.entries.push({
          shortId: cleanId,
          playerName: sanitizeText(item.playerName, 32) || cleanId,
          games: Number(item.games) || 0,
          moves: Number(item.moves) || 0,
          wins: Number(item.wins) || 0,
          losses: Number(item.losses) || 0,
          draws: Number(item.draws) || 0,
          points: Number(item.points) || 0,
          elo: Number(item.elo) || 800,
          monthly: item.monthly || null,
          daily: item.daily || null,
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      } else {
        if ((Number(item.points) || 0) > existing.points || (Number(item.moves) || 0) > (existing.moves || 0)) {
          existing.playerName = sanitizeText(item.playerName, 32) || existing.playerName;
          existing.games = Math.max(existing.games || 0, Number(item.games) || 0);
          existing.moves = Math.max(existing.moves || 0, Number(item.moves) || 0);
          existing.wins = Math.max(existing.wins, Number(item.wins) || 0);
          existing.losses = Math.max(existing.losses, Number(item.losses) || 0);
          existing.draws = Math.max(existing.draws, Number(item.draws) || 0);
          existing.points = Math.max(existing.points, Number(item.points) || 0);
          existing.elo = Math.max(existing.elo, Number(item.elo) || 800);
        }
        if (item.monthly?.key && (!existing.monthly || existing.monthly.key === item.monthly.key)) {
          const prev = existing.monthly || createPeriodBucket(item.monthly.key);
          existing.monthly = {
            key: item.monthly.key,
            points: Math.max(prev.points, Number(item.monthly.points) || 0),
            wins: Math.max(prev.wins, Number(item.monthly.wins) || 0),
            losses: Math.max(prev.losses, Number(item.monthly.losses) || 0),
            draws: Math.max(prev.draws, Number(item.monthly.draws) || 0),
            games: Math.max(prev.games, Number(item.monthly.games) || 0),
            moves: Math.max(prev.moves, Number(item.monthly.moves) || 0),
          };
        }
        if (item.daily?.key && (!existing.daily || existing.daily.key === item.daily.key)) {
          const prev = existing.daily || createPeriodBucket(item.daily.key);
          existing.daily = {
            key: item.daily.key,
            points: Math.max(prev.points, Number(item.daily.points) || 0),
            wins: Math.max(prev.wins, Number(item.daily.wins) || 0),
            losses: Math.max(prev.losses, Number(item.daily.losses) || 0),
            draws: Math.max(prev.draws, Number(item.daily.draws) || 0),
            games: Math.max(prev.games, Number(item.daily.games) || 0),
            moves: Math.max(prev.moves, Number(item.daily.moves) || 0),
          };
        }
      }
    }
    this.sortAndSave();
  }

  async syncFromGlobalTxt() {
    try {
      if (typeof fetch !== 'function') return;
      const res = await fetch('./data/mural-global.txt', { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseSafeTxtPayload(text);
        if (Array.isArray(parsed.entries)) {
          this.mergeEntries(parsed.entries);
        }
      }
      const remoteUrl = import.meta.env?.VITE_MURAL_ENDPOINT;
      if (remoteUrl) {
        const r = await fetch(remoteUrl, { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data?.entries)) this.mergeEntries(data.entries);
        }
      }
    } catch {
      // Silencioso quando offline
    }
  }

  async pushToRemoteEndpoint() {
    try {
      const remoteUrl = import.meta.env?.VITE_MURAL_ENDPOINT;
      if (!remoteUrl || typeof fetch !== 'function') return;
      await fetch(remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: this.entries.slice(0, 50) }),
      });
    } catch {
      // Silencioso se relay não estiver configurado
    }
  }

  importTxt(rawText) {
    const parsed = parseSafeTxtPayload(rawText);
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Arquivo de mural inválido.');
    }
    this.mergeEntries(parsed.entries);
  }

  /**
   * Retorna o ranking filtrado por categoria ('geral', 'mensal' ou 'diaria'), até 50 posições.
   */
  getRanking(category = 'geral', limit = 50) {
    if (category === 'mensal') {
      const monthKey = getCurrentMonthKey();
      return this.entries
        .filter((e) => e.monthly && e.monthly.key === monthKey && (e.monthly.games > 0 || e.monthly.moves > 0))
        .map((e) => ({
          shortId: e.shortId,
          playerName: e.playerName,
          elo: e.elo,
          ...e.monthly,
        }))
        .sort((a, b) => b.points - a.points || b.elo - a.elo || b.moves - a.moves)
        .slice(0, limit);
    }

    if (category === 'diaria') {
      const dayKey = getCurrentDayKey();
      return this.entries
        .filter((e) => e.daily && e.daily.key === dayKey && (e.daily.games > 0 || e.daily.moves > 0))
        .map((e) => ({
          shortId: e.shortId,
          playerName: e.playerName,
          elo: e.elo,
          ...e.daily,
        }))
        .sort((a, b) => b.points - a.points || b.elo - a.elo || b.moves - a.moves)
        .slice(0, limit);
    }

    return this.entries.slice(0, limit);
  }

  getTopEntries(limit = 50) {
    return this.getRanking('geral', limit);
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
