import { GameState } from '../core/gameState.js';
import { chooseAdaptiveMove } from '../ai/chessAI.js';
import { PlayerProfileManager } from '../ai/playerProfile.js';
import { getOrCreateHwidHash } from '../storage/hwid.js';
import { saveMatchTxt } from '../storage/txtStorage.js';
import { ScoreboardManager } from '../storage/scoreboard.js';
import { registerAgentLayer } from './webmcp.js';

async function initAgentPage() {
  const hwidHash = await getOrCreateHwidHash();
  const gameState = new GameState();
  const profileManager = new PlayerProfileManager(hwidHash);
  const scoreboard = new ScoreboardManager();

  const pre = document.getElementById('agent-state-json');
  const moveInput = document.getElementById('agent-move-input');

  function render() {
    const state = {
      hwidHash,
      matchId: gameState.matchId,
      mode: gameState.mode,
      seed: gameState.seed,
      ...gameState.engine.getStatus(),
      legalMoves: gameState.engine.getLegalMoves().map((m) => m.san),
      scoreboard: scoreboard.getTopEntries(10),
    };
    pre.textContent = JSON.stringify(state, null, 2);
  }

  function executeMove(notation) {
    const res = gameState.engine.moveByNotation(notation);
    if (!res) return null;
    gameState.recordUpdate();
    saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
    render();
    return res;
  }

  function startNewGame(opts) {
    gameState.startNew(opts);
    saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
    render();
  }

  registerAgentLayer({
    gameState,
    executeMove,
    startNewGame,
    scoreboard,
    exportTxt: () => saveMatchTxt(hwidHash, gameState.serialize(hwidHash)),
  });

  document.getElementById('agent-move-btn').addEventListener('click', () => {
    executeMove(moveInput.value);
    moveInput.value = '';
  });

  document.getElementById('agent-ai-btn').addEventListener('click', () => {
    if (gameState.engine.isGameOver()) return;
    const move = chooseAdaptiveMove(gameState.engine.getFen(), profileManager.getAdaptiveConfig());
    if (move) executeMove(move.san);
  });

  document.getElementById('agent-new-btn').addEventListener('click', () => {
    startNewGame({ mode: '1vIA' });
  });

  render();
}

initAgentPage();
