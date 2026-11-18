import './style.css';
import { GameState } from './core/gameState.js';
import { SceneManager } from './rendering/sceneManager.js';
import { SoundManager } from './audio/soundManager.js';
import { TtsManager } from './audio/ttsManager.js';
import { PlayerProfileManager } from './ai/playerProfile.js';
import { chooseAdaptiveMove } from './ai/chessAI.js';
import { P2PManager } from './multiplayer/p2pManager.js';
import { getOrCreateHwidHash, setActiveHwidHash } from './storage/hwid.js';
import { downloadTxtFile, loadMatchTxt, saveMatchTxt } from './storage/txtStorage.js';
import { ScoreboardManager } from './storage/scoreboard.js';
import { AdminAuthManager } from './security/adminAuth.js';
import { parseSafeTxtPayload } from './security/sanitizer.js';
import { registerAgentLayer } from './agent/webmcp.js';
import { UIController } from './ui/uiController.js';

async function bootstrap() {
  let hwidHash = await getOrCreateHwidHash();
  const gameState = new GameState();
  const soundManager = new SoundManager();
  const subtitleEl = document.getElementById('tts-subtitle');
  const ttsManager = new TtsManager(soundManager, (text) => {
    subtitleEl.textContent = text;
  });

  const profileManager = new PlayerProfileManager(hwidHash);
  const scoreboard = new ScoreboardManager();
  const adminAuth = new AdminAuthManager();
  const ui = new UIController();

  let selectedSquare = null;
  let legalMovesForSelected = [];

  const sceneManager = new SceneManager(document.getElementById('canvas-container'), {
    onSquareClick: handleSquareClick,
  });

  const p2p = new P2PManager({
    onStatus: (msg, url) => {
      subtitleEl.textContent = msg;
      if (url) {
        ui.openP2PModal({
          inviteUrl: url,
          statusText: msg,
          onCreateRoom: () => p2p.hostRoom(gameState.serialize(hwidHash)),
        });
      }
    },
    onConnected: (isHost) => {
      gameState.mode = '1v1-p2p';
      gameState.humanColor = isHost ? 'w' : 'b';
      sceneManager.setCameraPreset(gameState.humanColor);
      ui.closeModal();
      updateHud();
    },
    onMove: async ({ from, to, promotion }) => {
      await applyMove(from, to, promotion, true);
    },
    onSync: (snapshot) => {
      gameState.restore(snapshot);
      loadWorldAndSync();
    },
    onDisconnected: () => {
      subtitleEl.textContent = 'Oponente P2P desconectou.';
    },
  });

  function loadWorldAndSync() {
    const biome = sceneManager.loadScenario(gameState.seed);
    document.getElementById('biome-badge').textContent = `Bioma: ${biome.name} (#${gameState.seed})`;
    sceneManager.syncBoard(gameState.engine);
    updateHud();
  }

  function updateHud() {
    const status = gameState.engine.getStatus();
    const statusBadge = document.getElementById('status-badge');
    if (status.isGameOver) {
      statusBadge.textContent =
        status.outcome === 'checkmate'
          ? `Xeque-mate! ${status.winner === 'w' ? 'Brancas' : 'Pretas'} venceram`
          : `Empate (${status.outcome})`;
    } else if (status.inCheck) {
      statusBadge.textContent = `XEQUE! Turno: ${status.turn === 'w' ? 'Brancas' : 'Pretas'}`;
    } else {
      statusBadge.textContent = `Turno: ${status.turn === 'w' ? 'Brancas' : 'Pretas'}`;
    }

    document.getElementById('match-info').textContent = `Modo: ${gameState.mode} | ${gameState.playerName}`;
    const cfg = profileManager.getAdaptiveConfig();
    document.getElementById('ai-info').textContent = `IA Elo: ${cfg.aiElo} (Prof. ${cfg.depth})`;
    document.getElementById('hwid-short').textContent = hwidHash;

    const historyEl = document.getElementById('move-history');
    historyEl.replaceChildren();
    for (const san of status.historySan) {
      const li = document.createElement('li');
      li.textContent = san;
      historyEl.append(li);
    }
  }

  async function applyMove(from, to, promotion = 'q', isRemote = false) {
    const moveTimeMs = Date.now() - gameState.lastMoveAt;
    const moveObj = gameState.engine.move(from, to, promotion);
    if (!moveObj) return null;

    selectedSquare = null;
    legalMovesForSelected = [];
    sceneManager.showHighlights(null, []);

    if (moveObj.captured) {
      soundManager.playSfx('capture');
      ttsManager.speak(moveObj.piece, 'attack');
    } else {
      soundManager.playSfx('move');
      ttsManager.speak(moveObj.piece, 'move');
    }

    await sceneManager.playMoveAnimation(moveObj, gameState.engine);
    gameState.recordUpdate();

    if (gameState.mode === '1vIA' && moveObj.color === gameState.humanColor) {
      profileManager.recordHumanMove(moveObj, moveTimeMs, gameState.engine.getHistory().length);
    }

    if (gameState.mode === '1v1-p2p' && !isRemote) {
      p2p.sendMove(from, to, promotion);
    }

    saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
    handlePostMoveState();
    return moveObj;
  }

  function handlePostMoveState() {
    const status = gameState.engine.getStatus();
    if (status.inCheck && !status.isGameOver) {
      soundManager.playSfx('check');
      ttsManager.speak('k', 'scared');
    }

    if (status.isGameOver) {
      let humanResult = 'draw';
      if (status.outcome === 'checkmate') {
        humanResult = status.winner === gameState.humanColor ? 'win' : 'loss';
      }
      if (humanResult === 'win') {
        soundManager.playSfx('victory');
        ttsManager.speak('k', 'victory');
      } else if (humanResult === 'loss') {
        soundManager.playSfx('defeat');
        ttsManager.speak('k', 'defeat');
      }
      const updatedProfile = profileManager.recordMatchOutcome(humanResult);
      scoreboard.recordResult({
        hwidHash,
        playerName: gameState.playerName,
        result: humanResult,
        elo: updatedProfile.elo,
      });
    } else if (gameState.mode === '1vIA' && status.turn !== gameState.humanColor) {
      setTimeout(runAiTurn, 420);
    }

    updateHud();
  }

  async function runAiTurn() {
    if (gameState.engine.isGameOver()) return;
    const cfg = profileManager.getAdaptiveConfig();
    const aiMove = chooseAdaptiveMove(gameState.engine.getFen(), cfg);
    if (aiMove) {
      await applyMove(aiMove.from, aiMove.to, aiMove.promotion || 'q', true);
    }
  }

  async function handleSquareClick(square) {
    if (gameState.engine.isGameOver()) return;
    const turn = gameState.engine.getTurn();
    if (gameState.mode === '1vIA' && turn !== gameState.humanColor) return;
    if (gameState.mode === '1v1-p2p' && turn !== gameState.humanColor) return;

    const targetMove = legalMovesForSelected.find((m) => m.to === square);
    if (selectedSquare && targetMove) {
      let promo = 'q';
      if (targetMove.flags.includes('p')) {
        promo = await ui.askPromotion();
      }
      await applyMove(selectedSquare, square, promo, false);
      return;
    }

    const piece = gameState.engine.getPieceAt(square);
    if (piece && piece.color === turn) {
      selectedSquare = square;
      legalMovesForSelected = gameState.engine.getLegalMoves(square);
      sceneManager.showHighlights(square, legalMovesForSelected);
      soundManager.playSfx('select');
      ttsManager.speak(piece.type, 'select');
    } else {
      selectedSquare = null;
      legalMovesForSelected = [];
      sceneManager.showHighlights(null, []);
    }
  }

  function startNewGame(opts) {
    gameState.startNew(opts);
    saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
    sceneManager.setCameraPreset(gameState.humanColor);
    loadWorldAndSync();
    if (gameState.mode === '1vIA' && gameState.humanColor === 'b') {
      setTimeout(runAiTurn, 500);
    }
  }

  // Botões da barra superior
  document.getElementById('btn-new-game').addEventListener('click', () => {
    ui.openNewGameModal({ currentName: gameState.playerName, onStart: startNewGame });
  });

  document.getElementById('btn-p2p').addEventListener('click', () => {
    ui.openP2PModal({
      inviteUrl: '',
      statusText: 'Gere um link e compartilhe com seu amigo.',
      onCreateRoom: () => p2p.hostRoom(gameState.serialize(hwidHash)),
    });
  });

  document.getElementById('btn-hwid').addEventListener('click', () => {
    ui.openHwidModal({
      hwidHash,
      onExportTxt: () => {
        const txt = saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
        downloadTxtFile(`mchess-${gameState.matchId}.txt`, txt);
      },
      onImportTxt: (rawText) => {
        try {
          const payload = parseSafeTxtPayload(rawText);
          if (payload.hwidHash) {
            hwidHash = setActiveHwidHash(payload.hwidHash);
            profileManager.setHwid(hwidHash);
          }
          gameState.restore(payload);
          loadWorldAndSync();
          subtitleEl.textContent = 'Partida restaurada do arquivo .TXT.';
        } catch (err) {
          subtitleEl.textContent = err.message || 'Erro ao importar arquivo .TXT.';
        }
      },
      onRecoverHash: (newHash) => {
        hwidHash = setActiveHwidHash(newHash);
        profileManager.setHwid(hwidHash);
        const saved = loadMatchTxt(hwidHash);
        if (saved) {
          gameState.restore(saved);
          loadWorldAndSync();
          subtitleEl.textContent = 'Sessão restaurada pelo Hash HWID.';
        } else {
          updateHud();
          subtitleEl.textContent = 'Hash HWID ativado. Nenhuma partida local anterior encontrada.';
        }
      },
    });
  });

  document.getElementById('btn-scoreboard').addEventListener('click', () => {
    ui.openScoreboardModal(scoreboard);
  });

  document.getElementById('btn-audio').addEventListener('click', () => {
    ui.openAudioModal(soundManager);
  });

  document.getElementById('btn-admin').addEventListener('click', () => {
    ui.openAdminModal({
      adminAuth,
      scoreboard,
      profileManager,
      onResetAll: () => updateHud(),
    });
  });

  document.getElementById('btn-cam-w').addEventListener('click', () => sceneManager.setCameraPreset('w'));
  document.getElementById('btn-cam-b').addEventListener('click', () => sceneManager.setCameraPreset('b'));
  document.getElementById('btn-cam-top').addEventListener('click', () => sceneManager.setCameraPreset('top'));
  document.getElementById('chk-low-quality').addEventListener('change', (ev) => {
    sceneManager.setLowQuality(ev.target.checked);
  });

  document.getElementById('btn-copy-hwid').addEventListener('click', async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(hwidHash);
      subtitleEl.textContent = 'Hash HWID copiado! Guarde para recuperar sua partida.';
    }
  });

  document.getElementById('btn-export-txt').addEventListener('click', () => {
    const txt = saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
    downloadTxtFile(`mchess-${gameState.matchId}.txt`, txt);
  });

  // Registra camada WebMCP para agentes
  registerAgentLayer({
    gameState,
    executeMove: (notation) => {
      const m = gameState.engine.moveByNotation(notation);
      if (!m) return null;
      gameState.recordUpdate();
      sceneManager.syncBoard(gameState.engine);
      saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
      updateHud();
      return m;
    },
    startNewGame,
    scoreboard,
    exportTxt: () => saveMatchTxt(hwidHash, gameState.serialize(hwidHash)),
  });

  // Recuperação automática ao abrir ou entrada via link de convite P2P
  const params = new URLSearchParams(window.location.search);
  const salaId = params.get('sala');
  if (salaId) {
    loadWorldAndSync();
    p2p.joinRoom(salaId);
  } else {
    const saved = loadMatchTxt(hwidHash);
    if (saved && saved.fen) {
      gameState.restore(saved);
      subtitleEl.textContent = 'Partida anterior restaurada automaticamente.';
    }
    loadWorldAndSync();
  }
}

bootstrap();
