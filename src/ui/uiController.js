import { sanitizeText, isValidHwidHash } from '../security/sanitizer.js';
import { downloadTxtFile } from '../storage/txtStorage.js';
import { MUSIC_TRACKS } from '../audio/soundManager.js';
import { COLOR_MODES } from '../accessibility/accessibilityManager.js';
import { mountAdminPieceStudio } from './adminStudio.js';

/**
 * Controla os modais e a interface do usuário usando apenas DOM seguro (sem innerHTML).
 */
export class UIController {
  constructor() {
    this.modal = document.getElementById('app-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBody = document.getElementById('modal-body');
    this.cleanupModal = null;

    document.getElementById('modal-close').addEventListener('click', () => {
      this.closeModal();
    });
    this.modal.addEventListener('close', () => {
      if (this.cleanupModal) {
        this.cleanupModal();
        this.cleanupModal = null;
      }
    });
  }

  openModal(title, builderFn) {
    if (this.cleanupModal) {
      this.cleanupModal();
      this.cleanupModal = null;
    }
    this.modalTitle.textContent = title;
    this.modalBody.replaceChildren();
    builderFn(this.modalBody);
    this.modal.showModal();
  }

  closeModal() {
    if (this.cleanupModal) {
      this.cleanupModal();
      this.cleanupModal = null;
    }
    if (this.modal.open) this.modal.close();
  }

  el(tag, text = '', className = '') {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  openWelcomeModal({ currentName, isInvite, onConfirm }) {
    this.openModal(isInvite ? 'Entrar na Partida 1 vs 1' : 'Bem-vindo ao MChess 3D', (body) => {
      const desc = this.el(
        'p',
        isInvite
          ? 'Informe seu Nick ou Nome antes de enfrentar o outro jogador:'
          : 'Informe seu Nick ou Nome para salvar seu progresso e entrar no Mural:',
      );
      const nickInput = this.el('input');
      nickInput.type = 'text';
      nickInput.placeholder = 'Ex: MiguelMagno, ReiDoXadrez...';
      nickInput.value = currentName || '';
      nickInput.maxLength = 32;

      const btnConfirm = this.el('button', 'Começar a Jogar', 'primary');
      btnConfirm.addEventListener('click', () => {
        const nick = sanitizeText(nickInput.value, 32) || 'Jogador';
        this.closeModal();
        onConfirm(nick);
      });

      body.append(desc, nickInput, btnConfirm);
    });
  }

  openNewGameModal({ currentName, onStart }) {
    this.openModal('Nova Partida', (body) => {
      const nameLabel = this.el('label', 'Nome do Jogador:');
      const nameInput = this.el('input');
      nameInput.type = 'text';
      nameInput.value = currentName || 'Miguel Magno';
      nameInput.maxLength = 32;

      const btnAiWhite = this.el('button', '1 vs IA (Jogar de Brancas)', 'primary');
      const btnAiBlack = this.el('button', '1 vs IA (Jogar de Pretas)');
      const btnLocal = this.el('button', '1 vs 1 Local (Mesmo Dispositivo)');

      btnAiWhite.addEventListener('click', () => {
        onStart({ mode: '1vIA', humanColor: 'w', playerName: sanitizeText(nameInput.value, 32) });
        this.closeModal();
      });
      btnAiBlack.addEventListener('click', () => {
        onStart({ mode: '1vIA', humanColor: 'b', playerName: sanitizeText(nameInput.value, 32) });
        this.closeModal();
      });
      btnLocal.addEventListener('click', () => {
        onStart({ mode: '1v1-local', humanColor: 'w', playerName: sanitizeText(nameInput.value, 32) });
        this.closeModal();
      });

      body.append(nameLabel, nameInput, btnAiWhite, btnAiBlack, btnLocal);
    });
  }

  openP2PModal({ inviteUrl, statusText, onCreateRoom }) {
    this.openModal('Convite 1 vs 1 (P2P WebRTC)', (body) => {
      const info = this.el('p', statusText || 'Crie uma sala e envie o link para outro jogador humano.');
      const urlBox = this.el('input');
      urlBox.type = 'text';
      urlBox.readOnly = true;
      urlBox.value = inviteUrl || '';

      const row = this.el('div', '', 'btn-row');
      const btnCreate = this.el('button', 'Gerar Link de Convite', 'primary');
      const btnCopy = this.el('button', 'Copiar Link');

      btnCreate.addEventListener('click', () => {
        onCreateRoom();
      });
      btnCopy.addEventListener('click', async () => {
        if (urlBox.value && navigator.clipboard) {
          await navigator.clipboard.writeText(urlBox.value);
          info.textContent = 'Link copiado para a área de transferência.';
        }
      });

      row.append(btnCreate, btnCopy);
      body.append(info, urlBox, row);
    });
  }

  openHwidModal({ hwidHash, onExportTxt, onImportTxt, onRecoverHash }) {
    this.openModal('Identificação HWID e Salvamento .TXT', (body) => {
      const warn = this.el(
        'p',
        'Anote e guarde este Hash SHA-256. Use o Hash ou o arquivo .txt para recuperar sua partida após limpar o cache.',
      );
      const hashCode = this.el('code', hwidHash, 'hwid-code');

      const row1 = this.el('div', '', 'btn-row');
      const btnCopy = this.el('button', 'Copiar Hash', 'primary');
      const btnExport = this.el('button', 'Baixar Partida (.TXT)');
      btnCopy.addEventListener('click', async () => {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(hwidHash);
          warn.textContent = 'Hash copiado! Guarde em local seguro.';
        }
      });
      btnExport.addEventListener('click', () => onExportTxt());
      row1.append(btnCopy, btnExport);

      const recoverLabel = this.el('label', 'Restaurar por Hash HWID:');
      const recoverInput = this.el('input');
      recoverInput.type = 'text';
      recoverInput.placeholder = 'Cole aqui o Hash SHA-256 salvo';
      const btnRecover = this.el('button', 'Carregar Sessão pelo Hash');
      btnRecover.addEventListener('click', () => {
        const val = recoverInput.value.trim();
        if (!isValidHwidHash(val)) {
          warn.textContent = 'Hash inválido. Informe um hash hexadecimal válido.';
          return;
        }
        onRecoverHash(val);
        this.closeModal();
      });

      const fileLabel = this.el('label', 'Ou importar arquivo .TXT salvo:');
      const fileInput = this.el('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt,text/plain';
      fileInput.addEventListener('change', async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        onImportTxt(text);
        this.closeModal();
      });

      body.append(warn, hashCode, row1, recoverLabel, recoverInput, btnRecover, fileLabel, fileInput);
    });
  }

  openAudioModal(soundManager) {
    this.openModal('Áudio e Vozes (Controles Independentes)', (body) => {
      const addControl = (label, enabled, volume, onToggle, onVol) => {
        const wrap = this.el('div', '', 'card');
        const chkRow = this.el('label', '', 'checkbox-row');
        const chk = this.el('input');
        chk.type = 'checkbox';
        chk.checked = enabled;
        chk.addEventListener('change', () => onToggle(chk.checked));
        chkRow.append(chk, this.el('span', label));

        const slider = this.el('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.05';
        slider.value = String(volume);
        slider.addEventListener('input', () => onVol(Number(slider.value)));

        wrap.append(chkRow, slider);
        body.append(wrap);
      };

      addControl(
        'Música de Fundo',
        soundManager.musicEnabled,
        soundManager.musicVolume,
        (v) => soundManager.setMusicEnabled(v),
        (v) => soundManager.setMusicVolume(v),
      );

      const trackWrap = this.el('div', '', 'card');
      const trackLabel = this.el('label', 'Escolher Faixa Musical:');
      const select = this.el('select');
      for (const track of MUSIC_TRACKS) {
        const opt = this.el('option', track.label);
        opt.value = track.id;
        if (track.id === soundManager.selectedTrackId) opt.selected = true;
        select.append(opt);
      }
      select.addEventListener('change', () => soundManager.setMusicTrack(select.value));
      const notice = this.el(
        'p',
        'Trilha sonora gerada originalmente no Google Flow, livre de direitos autorais.',
      );
      trackWrap.append(trackLabel, select, notice);
      body.append(trackWrap);

      addControl(
        'Efeitos Sonoros (Movimento e Combate)',
        soundManager.sfxEnabled,
        soundManager.sfxVolume,
        (v) => soundManager.setSfxEnabled(v),
        (v) => soundManager.setSfxVolume(v),
      );
      addControl(
        'Vozes das Peças (TTS PT-BR)',
        soundManager.voicesEnabled,
        soundManager.voicesVolume,
        (v) => soundManager.setVoicesEnabled(v),
        (v) => soundManager.setVoicesVolume(v),
      );
    });
  }

  openScoreboardModal(scoreboard) {
    this.openModal('Mural Global (Top 50 — Jogadores Humanos)', (body) => {
      let activeCat = 'geral';
      const tabsRow = this.el('div', '', 'btn-row');
      const contentBox = this.el('div', '', 'mural-content');

      const formatPlayerLabel = (item) => {
        const short8 = item.shortId.slice(0, 8);
        const nick = item.playerName ? item.playerName.trim() : '';
        const hasNick = nick && nick !== item.shortId && !item.shortId.startsWith(nick) && nick !== 'Anônimo';
        return hasNick ? `${nick} (${short8})` : short8;
      };

      const buildTable = (list, startRank) => {
        const table = this.el('table', '', 'score-table');
        const thead = this.el('thead');
        const trHead = this.el('tr');
        ['#', 'Jogador (Nick / HWID)', 'Pts', 'Partidas', 'Lances', 'V/E/D', 'Elo'].forEach((h) =>
          trHead.append(this.el('th', h)),
        );
        thead.append(trHead);
        table.append(thead);

        const tbody = this.el('tbody');
        list.forEach((item, idx) => {
          const tr = this.el('tr');
          tr.append(
            this.el('td', `${startRank + idx}º`),
            this.el('td', formatPlayerLabel(item)),
            this.el('td', String(item.points)),
            this.el('td', String(item.games ?? item.wins + item.draws + item.losses)),
            this.el('td', String(item.moves ?? 0)),
            this.el('td', `${item.wins}/${item.draws}/${item.losses}`),
            this.el('td', String(item.elo)),
          );
          tbody.append(tr);
        });
        table.append(tbody);
        return table;
      };

      const renderCategory = (cat) => {
        activeCat = cat;
        for (const btn of tabsRow.children) {
          btn.classList.toggle('primary', btn.dataset.cat === activeCat);
        }
        contentBox.replaceChildren();
        const entries = scoreboard.getRanking(cat, 50);
        if (entries.length === 0) {
          contentBox.append(this.el('p', 'Nenhum registro nesta categoria ainda.'));
          return;
        }

        const top10 = entries.slice(0, 10);
        const rest = entries.slice(10, 50);

        contentBox.append(this.el('h2', 'Top 10 — Elite'));
        contentBox.append(buildTable(top10, 1));

        if (rest.length > 0) {
          contentBox.append(this.el('h2', 'Classificação (11º ao 50º)'));
          contentBox.append(buildTable(rest, 11));
        }
      };

      const categories = [
        ['geral', 'Geral (Histórico)'],
        ['mensal', 'Mensal'],
        ['diaria', 'Diária'],
      ];
      for (const [catId, label] of categories) {
        const btn = this.el('button', label, catId === 'geral' ? 'primary' : '');
        btn.dataset.cat = catId;
        btn.addEventListener('click', () => renderCategory(catId));
        tabsRow.append(btn);
      }

      const infoGlobal = this.el(
        'p',
        'Classificação de jogadores humanos. Vitória: 3 pts | Empate: 1 pt. Salve seu HWID para manter o histórico.',
      );

      body.append(tabsRow, contentBox, infoGlobal);
      renderCategory('geral');
    });
  }

  openAccessibilityModal({ a11y, onPaletteChange, onToggleBlind, onDownloadLgpdTxt, onDeleteAllData }) {
    this.openModal('Acessibilidade, Inclusão e LGPD', (body) => {
      // 1. Daltonismo
      const colorCard = this.el('div', '', 'card');
      colorCard.append(this.el('h2', 'Modo de Cor (Daltonismo — Salvo no HWID)'));
      const select = this.el('select');
      for (const mode of COLOR_MODES) {
        const opt = this.el('option', mode.label);
        opt.value = mode.id;
        if (mode.id === a11y.colorMode) opt.selected = true;
        select.append(opt);
      }
      select.addEventListener('change', () => {
        a11y.setColorMode(select.value);
        onPaletteChange(a11y.getPalette());
      });
      colorCard.append(select);

      // 2. Modo Narrado para Cegos
      const blindCard = this.el('div', '', 'card');
      blindCard.append(this.el('h2', 'Modo Narrado para Cegos'));
      const chkRow = this.el('label', '', 'checkbox-row');
      const chk = this.el('input');
      chk.type = 'checkbox';
      chk.checked = a11y.blindNarrated;
      chk.addEventListener('change', () => {
        a11y.setBlindNarrated(chk.checked);
        onToggleBlind(chk.checked);
      });
      chkRow.append(chk, this.el('span', 'Ativar narração de casas, peças e movimento por teclado'));
      const help = this.el(
        'p',
        'Comandos: Setas (ou W/A/S e Shift+D) movem o cursor. Enter ou Espaço selecionam e movem. D descreve a casa. T informa o turno. A música fica bem baixa automaticamente (ajustável em Áudio).',
      );
      blindCard.append(chkRow, help);

      // 3. LGPD
      const lgpdCard = this.el('div', '', 'card');
      lgpdCard.append(
        this.el('h2', 'Privacidade e LGPD'),
        this.el(
          'p',
          'Seus dados (Nick, HWID, partidas em .txt e preferências) ficam apenas no seu navegador, sem banco de dados. Você pode baixar ou excluir tudo a qualquer momento.',
        ),
      );
      const lgpdRow = this.el('div', '', 'btn-row');
      const btnDownload = this.el('button', 'Baixar Meus Dados (.TXT)', 'primary');
      btnDownload.addEventListener('click', () => onDownloadLgpdTxt());

      const btnDelete = this.el('button', 'Excluir Todos os Meus Dados (LGPD)', 'danger');
      btnDelete.addEventListener('click', () => {
        onDeleteAllData();
        this.closeModal();
      });
      lgpdRow.append(btnDownload, btnDelete);
      lgpdCard.append(lgpdRow);

      body.append(colorCard, blindCard, lgpdCard);
    });
  }

  openAdminModal({ adminAuth, scoreboard, profileManager, adminAiStats, onStartAiVsAi, onResetAll }) {
    this.openModal('Acesso Exclusivo ADMIN', (body) => {
      if (!adminAuth.authenticated) {
        const msg = this.el('p', 'Informe a senha de administrador configurada.');
        const passInput = this.el('input');
        passInput.type = 'password';
        passInput.placeholder = 'Senha do ADMIN';
        const btnLogin = this.el('button', 'Entrar como ADMIN', 'primary');

        btnLogin.addEventListener('click', async () => {
          const res = await adminAuth.login(passInput.value);
          if (res.ok) {
            this.openAdminModal({
              adminAuth,
              scoreboard,
              profileManager,
              adminAiStats,
              onStartAiVsAi,
              onResetAll,
            });
          } else {
            msg.textContent = res.reason || 'Acesso negado.';
          }
        });
        body.append(msg, passInput, btnLogin);
        return;
      }

      const status = this.el('p', 'Sessão ADMIN ativa e verificada.');

      const aiCard = this.el('div', '', 'card');
      aiCard.append(
        this.el('h2', 'Arena IA vs IA (Privado ADMIN)'),
        this.el(
          'p',
          `Partidas: ${adminAiStats.games} | Brancas: ${adminAiStats.whiteWins} | Pretas: ${adminAiStats.blackWins} | Empates: ${adminAiStats.draws} | Lances: ${adminAiStats.totalMoves}`,
        ),
      );
      const btnAiVsAi = this.el('button', 'Iniciar Partida Automática IA vs IA', 'primary');
      btnAiVsAi.addEventListener('click', () => {
        this.closeModal();
        onStartAiVsAi();
      });
      aiCard.append(btnAiVsAi);

      const btnStudio = this.el('button', 'Visualizador de Peças (Stand Alone)', 'primary');
      btnStudio.addEventListener('click', () => {
        this.openModal('ADMIN — Visualizador Stand Alone', (studioBody) => {
          const btnBack = this.el('button', 'Voltar ao Painel ADMIN');
          btnBack.addEventListener('click', () => {
            this.openAdminModal({
              adminAuth,
              scoreboard,
              profileManager,
              adminAiStats,
              onStartAiVsAi,
              onResetAll,
            });
          });
          studioBody.append(btnBack);
          this.cleanupModal = mountAdminPieceStudio(studioBody, this);
        });
      });

      const agentLink = this.el('a', 'Abrir Modo Agente (WebMCP)', 'btn-link');
      agentLink.href = './agent.html';

      const btnExportMural = this.el('button', 'Exportar Mural Global (.TXT)', 'primary');
      btnExportMural.addEventListener('click', () => {
        downloadTxtFile('mural-global.txt', scoreboard.exportTxt());
      });

      const importLabel = this.el('label', 'Importar Mural (.TXT):');
      const fileInput = this.el('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt,text/plain';
      fileInput.addEventListener('change', async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        scoreboard.importTxt(text);
        status.textContent = 'Mural importado com sucesso.';
      });

      const btnExportProfile = this.el('button', 'Exportar Perfil IA (.TXT)');
      btnExportProfile.addEventListener('click', () => {
        downloadTxtFile('mchess-ia-profile.txt', profileManager.exportTxt());
      });

      const btnClearBoard = this.el('button', 'Limpar Mural de Pontuação', 'danger');
      btnClearBoard.addEventListener('click', () => {
        scoreboard.clearAll();
        onResetAll();
        status.textContent = 'Mural limpo com sucesso.';
      });

      const btnLogout = this.el('button', 'Sair do Modo ADMIN');
      btnLogout.addEventListener('click', () => {
        adminAuth.logout();
        this.closeModal();
      });

      body.append(
        status,
        btnStudio,
        aiCard,
        agentLink,
        btnExportMural,
        importLabel,
        fileInput,
        btnExportProfile,
        btnClearBoard,
        btnLogout,
      );
    });
  }

  askPromotion() {
    return new Promise((resolve) => {
      this.openModal('Promoção de Peão', (body) => {
        body.append(this.el('p', 'Escolha a nova peça:'));
        const options = [
          ['q', 'Rainha'],
          ['r', 'Torre'],
          ['b', 'Bispo'],
          ['n', 'Cavalo'],
        ];
        const row = this.el('div', '', 'btn-row');
        for (const [code, label] of options) {
          const btn = this.el('button', label, code === 'q' ? 'primary' : '');
          btn.addEventListener('click', () => {
            this.closeModal();
            resolve(code);
          });
          row.append(btn);
        }
        body.append(row);
      });
    });
  }

  pickGameOverAnnouncement(result, winnerLabel = '') {
    const pools = {
      win: [
        `Vitória magistral! ${winnerLabel ? `${winnerLabel} dominou` : 'Você dominou'} o tabuleiro!`,
        `Xeque-mate perfeito! O Rei adversário caiu diante da sua estratégia!`,
        `Triunfo épico! Hoje a coroa do tabuleiro pertence a ${winnerLabel || 'você'}!`,
        `Vitória brilhante! Cada lance construiu esse xeque-mate decisivo!`,
        `Glória no reino! Uma partida vencida com coragem e precisão!`,
        `Espetacular! Vitória conquistada do primeiro ao último movimento!`,
      ],
      loss: [
        `Derrota honrosa! O Rei caiu, mas cada partida fortalece sua mente.`,
        `Não foi desta vez! Analise os lances e volte ainda mais forte na revanche.`,
        `O adversário levou a melhor hoje (${winnerLabel || 'xeque-mate'}). Que tal outra batalha?`,
        `Xeque-mate sofrido! Grandes mestres também evoluem nas derrotas.`,
        `Fim de combate! Levante a guarda e surpreenda na próxima abertura!`,
      ],
      draw: [
        `Empate equilibrado! Nenhum dos reinos cedeu terreno.`,
        `Paz no tabuleiro! A batalha terminou em igualdade absoluta.`,
        `Empate técnico! Defesa e ataque se anularam até o fim.`,
        `Divisão de honra! Ambos os lados lutaram até o último recurso.`,
        `Resultado empatado! Uma disputa acirrada do início ao fim.`,
      ],
    };

    const list = pools[result] || pools.draw;
    let chosen = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && chosen === this.lastGameOverMsg) {
      chosen = list[(list.indexOf(chosen) + 1) % list.length];
    }
    this.lastGameOverMsg = chosen;
    return chosen;
  }

  openGameOverModal({ result, title, message, lowQuality, onNewGame }) {
    this.openModal(title, (body) => {
      const banner = this.el('div', '', `gameover-banner ${lowQuality ? '' : `fx-${result}`}`);
      const msgEl = this.el('p', message, 'gameover-msg');
      banner.append(msgEl);

      const row = this.el('div', '', 'btn-row');
      const btnNew = this.el('button', 'Jogar Novamente', 'primary');
      btnNew.addEventListener('click', () => {
        this.closeModal();
        onNewGame();
      });
      const btnClose = this.el('button', 'Ver Tabuleiro');
      btnClose.addEventListener('click', () => this.closeModal());
      row.append(btnNew, btnClose);

      body.append(banner, row);
    });
  }
}
