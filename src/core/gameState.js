import { ChessEngine } from './chessEngine.js';

/**
 * Gerencia o estado global da partida de xadrez 3D.
 */
export class GameState {
  constructor() {
    this.engine = new ChessEngine();
    this.mode = '1vIA'; // '1vIA' | '1v1-local' | '1v1-p2p'
    this.humanColor = 'w';
    this.playerName = 'Miguel Magno';
    this.opponentName = 'IA Magno';
    this.seed = this.generateSeed();
    this.matchId = this.generateMatchId();
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.lastMoveAt = Date.now();
  }

  generateSeed() {
    return Math.floor(100000 + Math.random() * 900000);
  }

  generateMatchId() {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `MCHESS-${rand}`;
  }

  startNew({ mode = '1vIA', humanColor = 'w', seed = null, playerName = 'Jogador', opponentName = null } = {}) {
    this.engine.reset();
    this.mode = mode;
    this.humanColor = humanColor;
    this.playerName = playerName || 'Jogador';
    this.opponentName =
      opponentName || (mode === '1vIA' ? 'IA Magno' : mode === '1v1-local' ? 'Jogador 2' : 'Convidado P2P');
    this.seed = seed ?? this.generateSeed();
    this.matchId = this.generateMatchId();
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.lastMoveAt = Date.now();
  }

  recordUpdate() {
    this.updatedAt = new Date().toISOString();
    this.lastMoveAt = Date.now();
  }

  serialize(hwidHash) {
    return {
      version: 1,
      hwidHash,
      matchId: this.matchId,
      mode: this.mode,
      humanColor: this.humanColor,
      playerName: this.playerName,
      opponentName: this.opponentName,
      seed: this.seed,
      fen: this.engine.getFen(),
      pgn: this.engine.getPgn(),
      historySan: this.engine.getHistory(false),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  restore(snapshot) {
    this.matchId = snapshot.matchId || this.generateMatchId();
    this.mode = snapshot.mode || '1vIA';
    this.humanColor = snapshot.humanColor === 'b' ? 'b' : 'w';
    this.playerName = snapshot.playerName || 'Jogador';
    this.opponentName = snapshot.opponentName || 'IA Magno';
    this.seed = Number.isFinite(snapshot.seed) ? snapshot.seed : this.generateSeed();
    this.createdAt = snapshot.createdAt || new Date().toISOString();
    this.updatedAt = snapshot.updatedAt || new Date().toISOString();
    if (snapshot.pgn) {
      try {
        this.engine.loadPgn(snapshot.pgn);
        return true;
      } catch {
        // Fallback para FEN se PGN falhar
      }
    }
    if (snapshot.fen) {
      this.engine.loadFen(snapshot.fen);
      return true;
    }
    return false;
  }
}
