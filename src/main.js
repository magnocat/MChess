import './style.css';
import { GameState } from './core/gameState.js';
import { SceneManager } from './rendering/sceneManager.js';
import { SoundManager } from './audio/soundManager.js';
import { TtsManager } from './audio/ttsManager.js';
import { PlayerProfileManager } from './ai/playerProfile.js';
import { chooseAdaptiveMove } from './ai/chessAI.js';
import { P2PManager } from './multiplayer/p2pManager.js';
import { getOrCreateHwidHash, setActiveHwidHash } from './storage/hwid.js';
import { downloadTxtFile, formatTxtRecord, loadMatchTxt, saveMatchTxt } from './storage/txtStorage.js';
import { ScoreboardManager } from './storage/scoreboard.js';
import { AdminAuthManager } from './security/adminAuth.js';
import { parseSafeTxtPayload } from './security/sanitizer.js';
import { registerAgentLayer } from './agent/webmcp.js';
import { UIController } from './ui/uiController.js';
import { AccessibilityManager } from './accessibility/accessibilityManager.js';
import { LearningView } from './learning/learningView.js';

async function bootstrap() {
  let hwidHash = await getOrCreateHwidHash();
  const gameState = new GameState();
  const soundManager = new SoundManager();
  const subtitleEl = document.getElementById('tts-subtitle');
  let subtitleTimer = null;
  const showSubtitle = (text, durationMs = 2800) => {
    if (!subtitleEl || !text) return;
    subtitleEl.textContent = text;
    subtitleEl.classList.add('visible');
    if (subtitleTimer) clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => {
      subtitleEl.classList.remove('visible');
    }, durationMs);
  };

  const unlockMusicOnGesture = () => {
    if (soundManager.musicEnabled && !soundManager.audioEl && !soundManager.musicTimer) {
      soundManager.startMusicLoop();
    }
    window.removeEventListener('pointerdown', unlockMusicOnGesture);
    window.removeEventListener('keydown', unlockMusicOnGesture);
  };
  window.addEventListener('pointerdown', unlockMusicOnGesture, { once: true });
  window.addEventListener('keydown', unlockMusicOnGesture, { once: true });
  const ttsManager = new TtsManager(soundManager, (text) => {
    showSubtitle(text, 2800);
  });

  const profileManager = new PlayerProfileManager(hwidHash);
  const scoreboard = new ScoreboardManager();
  scoreboard.syncFromGlobalTxt();
  const adminAuth = new AdminAuthManager();
  const a11y = new AccessibilityManager(hwidHash);
  if (a11y.blindNarrated) {
    soundManager.setMusicVolume(0.06);
  }
  const ui = new UIController();

  // Atualiza automaticamente o período de copyright e a versão do commit
  const copyrightEl = document.getElementById('copyright-period');
  if (copyrightEl) {
    const startYear = 2026;
    const currentYear = new Date().getFullYear();
    copyrightEl.textContent = currentYear > startYear ? `${startYear}–${currentYear}` : `${startYear}`;
  }
  const versionEl = document.getElementById('app-version');
  if (versionEl) {
    const commit = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'local';
    const buildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';
    versionEl.textContent = buildTime ? `Versão ${commit} (${buildTime})` : `Versão ${commit}`;
  }

  const ADMIN_AI_STATS_KEY = 'mchess_admin_ai_stats';
  let adminAiStats = { games: 0, whiteWins: 0, blackWins: 0, draws: 0, totalMoves: 0 };
  try {
    const rawStats = localStorage.getItem(ADMIN_AI_STATS_KEY);
    if (rawStats) adminAiStats = { ...adminAiStats, ...JSON.parse(rawStats) };
  } catch {
    // Ignora erro de leitura
  }
  const saveAdminAiStats = () => {
    try {
      localStorage.setItem(ADMIN_AI_STATS_KEY, JSON.stringify(adminAiStats));
    } catch {
      // Ignora erro de escrita
    }
  };

  let selectedSquare = null;
  let legalMovesForSelected = [];

  const sceneManager = new SceneManager(document.getElementById('canvas-container'), {
    onSquareClick: handleSquareClick,
  });
  sceneManager.setColorPalette(a11y.getPalette());
  const lowQualityChk = document.getElementById('chk-low-quality');
  if (lowQualityChk) lowQualityChk.checked = sceneManager.lowQuality;
  const specialModeChk = document.getElementById('chk-special-mode');
  if (specialModeChk) specialModeChk.checked = sceneManager.specialMode;
  const animatedModeChk = document.getElementById('chk-animated-mode');
  if (animatedModeChk) animatedModeChk.checked = sceneManager.animatedMode;
  const animalsModeChk = document.getElementById('chk-animals-mode');
  if (animalsModeChk) animalsModeChk.checked = sceneManager.animalsMode;

  const p2p = new P2PManager({
    onStatus: (msg, url) => {
      showSubtitle(msg);
      if (url) {
        ui.openP2PModal({
          inviteUrl: url,
          statusText: msg,
          onCreateRoom: () =>
            p2p.hostRoom({
              ...gameState.serialize(hwidHash),
              scoreboardEntries: scoreboard.getTopEntries(20),
            }),
        });
      }
    },
    onConnected: (isHost) => {
      gameState.mode = '1v1-p2p';
      gameState.humanColor = isHost ? 'w' : 'b';
      sceneManager.setCameraPreset(gameState.humanColor);
      p2p.send({
        type: 'SYNC',
        payload: { scoreboardEntries: scoreboard.getTopEntries(20) },
      });
      ui.closeModal();
      updateHud();
    },
    onMove: async ({ from, to, promotion }) => {
      await applyMove(from, to, promotion, true);
    },
    onSync: (snapshot) => {
      if (Array.isArray(snapshot.scoreboardEntries)) {
        scoreboard.mergeEntries(snapshot.scoreboardEntries);
      }
      if (snapshot.fen) {
        gameState.restore(snapshot);
        loadWorldAndSync();
      }
    },
    onDisconnected: () => {
      showSubtitle('Oponente P2P desconectou.');
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
    const hwidMiniEl = document.getElementById('hwid-mini');
    if (hwidMiniEl) hwidMiniEl.textContent = hwidHash.slice(0, 8);

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

    if (gameState.mode === 'IAvIA') {
      adminAiStats.totalMoves += 1;
      saveAdminAiStats();
    } else if (moveObj.color === gameState.humanColor) {
      if (gameState.mode === '1vIA') {
        profileManager.recordHumanMove(moveObj, moveTimeMs, gameState.engine.getHistory().length);
      }
      scoreboard.recordMove({
        hwidHash,
        playerName: gameState.playerName,
        elo: profileManager.profile.elo,
      });
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
      if (gameState.mode === 'IAvIA') {
        adminAiStats.games += 1;
        let aiResult = 'draw';
        let aiWinnerLabel = 'Empate';
        if (status.outcome === 'checkmate') {
          if (status.winner === 'w') {
            adminAiStats.whiteWins += 1;
            aiWinnerLabel = 'IA Brancas';
          } else {
            adminAiStats.blackWins += 1;
            aiWinnerLabel = 'IA Pretas';
          }
          aiResult = 'win';
          soundManager.playSfx('victory');
        } else {
          adminAiStats.draws += 1;
        }
        saveAdminAiStats();
        sceneManager.playEndGameEffect(aiResult);
        showSubtitle(ui.pickGameOverAnnouncement(aiResult, aiWinnerLabel), 4200);
        updateHud();
        return;
      }

      let humanResult = 'draw';
      let winnerLabel = '';
      if (status.outcome === 'checkmate') {
        const winnerSide = status.winner === 'w' ? 'Brancas' : 'Pretas';
        if (gameState.mode === '1v1-local') {
          humanResult = 'win';
          winnerLabel = winnerSide;
        } else {
          humanResult = status.winner === gameState.humanColor ? 'win' : 'loss';
          winnerLabel = humanResult === 'win' ? gameState.playerName : winnerSide;
        }
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

      const title =
        humanResult === 'win'
          ? 'Vitória!'
          : humanResult === 'loss'
            ? 'Fim de Partida — Derrota'
            : 'Fim de Partida — Empate';
      const variedMsg = ui.pickGameOverAnnouncement(humanResult, winnerLabel);

      sceneManager.playEndGameEffect(humanResult);
      a11y.narrate(`${title} ${variedMsg}`, (t) => showSubtitle(t, 4500));
      ui.openGameOverModal({
        result: humanResult,
        title,
        message: variedMsg,
        lowQuality: sceneManager.lowQuality,
        onNewGame: () => ui.openNewGameModal({ currentName: gameState.playerName, onStart: startNewGame }),
      });
    } else if (gameState.mode === 'IAvIA') {
      setTimeout(runAiTurn, 420);
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
    if (gameState.mode === 'IAvIA') return;
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
    localStorage.setItem('mchess_player_nick', gameState.playerName);
    scoreboard.ensurePlayer({
      hwidHash,
      playerName: gameState.playerName,
      elo: profileManager.profile.elo,
      incrementGames: true,
    });
    soundManager.selectRandomTrack();
    saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
    sceneManager.setCameraPreset(gameState.humanColor);
    loadWorldAndSync();
    if (gameState.mode === '1vIA' && gameState.humanColor === 'b') {
      setTimeout(runAiTurn, 500);
    }
  }

  const learningView = new LearningView(document.getElementById('learning-overlay'), {
    onClose: () => {},
    onNarrate: (txt) => a11y.narrate(txt, (t) => showSubtitle(t, 4000)),
  });

  // Botões da barra superior
  document.getElementById('btn-new-game').addEventListener('click', () => {
    ui.openNewGameModal({ currentName: gameState.playerName, onStart: startNewGame });
  });
  document.getElementById('btn-learning').addEventListener('click', () => {
    learningView.open(gameState.engine.getStatus().historySan);
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
            a11y.setHwid(hwidHash);
            sceneManager.setColorPalette(a11y.getPalette());
          }
          gameState.restore(payload);
          loadWorldAndSync();
          showSubtitle('Partida restaurada do arquivo .TXT.');
        } catch (err) {
          showSubtitle(err.message || 'Erro ao importar arquivo .TXT.');
        }
      },
      onRecoverHash: (newHash) => {
        hwidHash = setActiveHwidHash(newHash);
        profileManager.setHwid(hwidHash);
        a11y.setHwid(hwidHash);
        sceneManager.setColorPalette(a11y.getPalette());
        const saved = loadMatchTxt(hwidHash);
        if (saved) {
          gameState.restore(saved);
          loadWorldAndSync();
          showSubtitle('Sessão restaurada pelo Hash HWID.');
        } else {
          updateHud();
          showSubtitle('Hash HWID ativado. Nenhuma partida local anterior encontrada.');
        }
      },
    });
  });

  document.getElementById('btn-scoreboard').addEventListener('click', async () => {
    await scoreboard.syncFromGlobalTxt();
    ui.openScoreboardModal(scoreboard);
  });

  document.getElementById('btn-audio').addEventListener('click', () => {
    ui.openAudioModal(soundManager);
  });

  document.getElementById('btn-a11y').addEventListener('click', () => {
    ui.openAccessibilityModal({
      a11y,
      onPaletteChange: (palette) => {
        sceneManager.setColorPalette(palette);
        if (sceneManager.animatedMode) {
          sceneManager.syncBoard(gameState.engine);
        }
        sceneManager.showHighlights(
          selectedSquare,
          legalMovesForSelected,
          a11y.blindNarrated ? a11y.getCursorSquare() : null,
        );
      },
      onToggleBlind: (enabled) => {
        if (enabled) {
          soundManager.setMusicVolume(0.06);
          const sq = a11y.getCursorSquare();
          sceneManager.showHighlights(selectedSquare, legalMovesForSelected, sq);
          a11y.narrate(
            `Modo narrado ativado. Música reduzida para facilitar a audição. Use Setas para navegar, Enter para mover, D para descrever e T para o turno. ${a11y.describeSquare(gameState.engine, sq)}`,
            (t) => showSubtitle(t, 4500),
          );
        } else {
          sceneManager.showHighlights(selectedSquare, legalMovesForSelected, null);
        }
      },
      onDownloadLgpdTxt: () => {
        const bundle = formatTxtRecord('LGPD_EXPORT', hwidHash, {
          nick: gameState.playerName,
          match: gameState.serialize(hwidHash),
          aiProfile: profileManager.profile,
          accessibility: { colorMode: a11y.colorMode, blindNarrated: a11y.blindNarrated },
          scoreboard: scoreboard.entries.filter((e) => e.shortId === hwidHash.slice(0, 12)),
        });
        downloadTxtFile(`mchess-lgpd-${hwidHash.slice(0, 8)}.txt`, bundle);
        showSubtitle('Seus dados foram baixados em formato .TXT.');
      },
      onDeleteAllData: () => {
        scoreboard.removeByShortId(hwidHash.slice(0, 12));
        localStorage.removeItem('mchess_player_nick');
        localStorage.removeItem(`mchess_save_${hwidHash}`);
        localStorage.removeItem(`mchess_profile_${hwidHash}`);
        localStorage.removeItem(`mchess_a11y_${hwidHash}`);
        localStorage.removeItem('mchess_hwid_hash');
        localStorage.removeItem('mchess_hwid_salt');
        a11y.setColorMode('normal');
        a11y.setBlindNarrated(false);
        sceneManager.setColorPalette(a11y.getPalette());
        gameState.startNew({ mode: '1vIA', humanColor: 'w', playerName: 'Anônimo' });
        loadWorldAndSync();
        showSubtitle('Todos os seus dados locais foram excluídos (LGPD).');
      },
    });
  });

  window.addEventListener('keydown', (ev) => {
    if (!a11y.blindNarrated) return;
    const tag = ev.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    let movedCursor = false;
    if (ev.key === 'ArrowRight' || (ev.key.toLowerCase() === 'd' && ev.shiftKey)) {
      a11y.moveCursor(1, 0);
      movedCursor = true;
    } else if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') {
      a11y.moveCursor(-1, 0);
      movedCursor = true;
    } else if (ev.key === 'ArrowUp' || ev.key === 'w' || ev.key === 'W') {
      a11y.moveCursor(0, 1);
      movedCursor = true;
    } else if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'S') {
      a11y.moveCursor(0, -1);
      movedCursor = true;
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      handleSquareClick(a11y.getCursorSquare());
      return;
    } else if (ev.key === 'd' || ev.key === 'D') {
      const sq = a11y.getCursorSquare();
      a11y.narrate(a11y.describeSquare(gameState.engine, sq), (t) => showSubtitle(t, 4000));
      return;
    } else if (ev.key === 't' || ev.key === 'T') {
      const st = gameState.engine.getStatus();
      const turnPt = st.turn === 'w' ? 'Brancas' : 'Pretas';
      const checkMsg = st.inCheck ? 'Atenção: Rei em xeque!' : '';
      a11y.narrate(`Turno das ${turnPt}. ${checkMsg}`, (t) => showSubtitle(t, 3500));
      return;
    }

    if (movedCursor) {
      ev.preventDefault();
      const sq = a11y.getCursorSquare();
      sceneManager.showHighlights(selectedSquare, legalMovesForSelected, sq);
      a11y.narrate(a11y.describeSquare(gameState.engine, sq), (t) => showSubtitle(t, 4000));
    }
  });

  document.getElementById('btn-admin').addEventListener('click', () => {
    ui.openAdminModal({
      adminAuth,
      scoreboard,
      profileManager,
      adminAiStats,
      onStartAiVsAi: () => {
        gameState.startNew({
          mode: 'IAvIA',
          humanColor: 'w',
          playerName: 'IA Brancas',
          opponentName: 'IA Pretas',
        });
        soundManager.selectRandomTrack();
        sceneManager.setCameraPreset('top');
        loadWorldAndSync();
        setTimeout(runAiTurn, 450);
      },
      onResetAll: () => updateHud(),
    });
  });

  document.getElementById('btn-cam-w').addEventListener('click', () => sceneManager.setCameraPreset('w'));
  document.getElementById('btn-cam-b').addEventListener('click', () => sceneManager.setCameraPreset('b'));
  document.getElementById('btn-cam-top').addEventListener('click', () => sceneManager.setCameraPreset('top'));
  document.getElementById('chk-low-quality').addEventListener('change', (ev) => {
    sceneManager.setLowQuality(ev.target.checked);
    if (ev.target.checked) {
      if (specialModeChk) {
        specialModeChk.checked = false;
        sceneManager.setSpecialMode(false);
      }
      if (animatedModeChk) {
        animatedModeChk.checked = false;
        sceneManager.setAnimatedMode(false, gameState.engine);
      }
      if (animalsModeChk) {
        animalsModeChk.checked = false;
        sceneManager.setAnimalsMode(false, gameState.engine);
      }
    }
  });
  if (specialModeChk) {
    specialModeChk.addEventListener('change', (ev) => {
      sceneManager.setSpecialMode(ev.target.checked);
      showSubtitle(ev.target.checked ? 'Modo Especial ativado: finalizações exclusivas!' : 'Modo Especial desativado.');
    });
  }
  if (animatedModeChk) {
    animatedModeChk.addEventListener('change', (ev) => {
      if (ev.target.checked && animalsModeChk) animalsModeChk.checked = false;
      sceneManager.setAnimatedMode(ev.target.checked, gameState.engine);
      showSubtitle(
        ev.target.checked
          ? 'Modo Animado (Skinview3D) ativado: peças com animação fluida!'
          : 'Modo Animado desativado.',
      );
    });
  }
  if (animalsModeChk) {
    animalsModeChk.addEventListener('change', (ev) => {
      if (ev.target.checked && animatedModeChk) animatedModeChk.checked = false;
      sceneManager.setAnimalsMode(ev.target.checked, gameState.engine);
      document.getElementById('biome-badge').textContent = ev.target.checked
        ? 'Bioma: Animals Game (Prado Wild Run)'
        : `Bioma: ${sceneManager.loadScenario(gameState.seed).name} (#${gameState.seed})`;
      showSubtitle(
        ev.target.checked
          ? 'Animals Game ativado: animais articulados com IK no prado Wild Run!'
          : 'Animals Game desativado.',
      );
    });
  }

  document.getElementById('btn-copy-hwid').addEventListener('click', async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(hwidHash);
      showSubtitle('Hash HWID copiado! Guarde para recuperar sua partida.');
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
  const NICK_KEY = 'mchess_player_nick';
  const savedNick = localStorage.getItem(NICK_KEY);
  const params = new URLSearchParams(window.location.search);
  const salaId = params.get('sala');

  gameState.playerName = savedNick || hwidHash.slice(0, 12);
  scoreboard.ensurePlayer({
    hwidHash,
    playerName: gameState.playerName,
    elo: profileManager.profile.elo,
  });

  if (salaId) {
    loadWorldAndSync();
    if (!savedNick) {
      ui.openWelcomeModal({
        currentName: '',
        isInvite: true,
        onConfirm: (nick) => {
          localStorage.setItem(NICK_KEY, nick);
          gameState.playerName = nick;
          scoreboard.ensurePlayer({
            hwidHash,
            playerName: nick,
            elo: profileManager.profile.elo,
            incrementGames: true,
          });
          updateHud();
          p2p.joinRoom(salaId);
        },
      });
    } else {
      p2p.joinRoom(salaId);
    }
  } else {
    const saved = loadMatchTxt(hwidHash);
    if (saved && saved.fen) {
      gameState.restore(saved);
      showSubtitle('Partida anterior restaurada automaticamente.');
    }
    loadWorldAndSync();
    if (!savedNick) {
      ui.openWelcomeModal({
        currentName: '',
        isInvite: false,
        onConfirm: (nick) => {
          localStorage.setItem(NICK_KEY, nick);
          gameState.playerName = nick;
          scoreboard.ensurePlayer({
            hwidHash,
            playerName: nick,
            elo: profileManager.profile.elo,
            incrementGames: true,
          });
          saveMatchTxt(hwidHash, gameState.serialize(hwidHash));
          updateHud();
        },
      });
    }
  }
}

bootstrap();
