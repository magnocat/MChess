import { Chess } from 'chess.js';
import { chooseAdaptiveMove } from '../ai/chessAI.js';
import {
  detectOpening,
  PIECE_TEACHING_GUIDE,
  VERIFIED_PUZZLES,
} from './openingsAndPuzzles.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PIECE_UNICODE = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evaluateMaterial(chess) {
  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const cell = board[r][c];
      if (!cell) continue;
      const val = PIECE_VALUES[cell.type] || 0;
      score += cell.color === 'w' ? val : -val;
    }
  }
  return score;
}

function classifyMoveDelta(deltaCp) {
  if (deltaCp <= 0.15) return { label: 'Excelente', cls: 'tag-good' };
  if (deltaCp <= 0.6) return { label: 'Bom', cls: 'tag-good' };
  if (deltaCp <= 1.5) return { label: 'Imprecisão', cls: 'tag-warn' };
  if (deltaCp <= 3.0) return { label: 'Erro', cls: 'tag-bad' };
  return { label: 'Erro Grave (Blunder)', cls: 'tag-bad' };
}

/**
 * Renderiza o Modo Aprendizado 2D (peças chapadas vista de cima, replay, puzzles e ensino).
 */
export class LearningView {
  constructor(overlayEl, { onClose, onNarrate }) {
    this.overlay = overlayEl;
    this.onClose = onClose;
    this.onNarrate = onNarrate;
    this.autoTimer = null;
    this.activeTab = 'replay';
    this.replayMoves = [];
    this.replayIndex = 0;
    this.puzzleIndex = 0;
    this.selectedSq = null;
    this.legalTargets = [];
    this.puzzleChess = new Chess();
    this.guidePieceType = 'n';
  }

  el(tag, text = '', className = '') {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  open(historySan = []) {
    this.stopAutoReplay();
    this.replayMoves =
      Array.isArray(historySan) && historySan.length > 0
        ? [...historySan]
        : ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7'];
    this.replayIndex = this.replayMoves.length;
    this.activeTab = 'replay';
    this.loadPuzzle(0);
    this.render();
    this.overlay.classList.add('open');
  }

  close() {
    this.stopAutoReplay();
    this.overlay.classList.remove('open');
    if (this.onClose) this.onClose();
  }

  stopAutoReplay() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  loadPuzzle(idx) {
    this.puzzleIndex = (idx + VERIFIED_PUZZLES.length) % VERIFIED_PUZZLES.length;
    const pz = VERIFIED_PUZZLES[this.puzzleIndex];
    this.puzzleChess = new Chess(pz.fen);
    this.selectedSq = null;
    this.legalTargets = [];
  }

  getReplayChessAt(stepIdx) {
    const chess = new Chess();
    let lastMove = null;
    for (let i = 0; i < stepIdx && i < this.replayMoves.length; i += 1) {
      lastMove = chess.move(this.replayMoves[i]);
      if (!lastMove) break;
    }
    return { chess, lastMove };
  }

  renderBoard2D(boardEl, chess, { lastMove = null, interactive = false, onSquareClick = null }) {
    boardEl.replaceChildren();
    const board = chess.board();
    const inCheck = chess.inCheck();
    const turn = chess.turn();

    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const sq = `${FILES[c]}${8 - r}`;
        const isLight = (r + c) % 2 === 0;
        const cell = board[r][c];
        const sqEl = this.el('button', '', `sq-2d ${isLight ? 'light' : 'dark'}`);
        sqEl.type = 'button';
        sqEl.setAttribute('aria-label', `Casa ${sq}`);

        if (lastMove && (lastMove.from === sq || lastMove.to === sq)) {
          sqEl.classList.add('last-move');
        }
        if (this.selectedSq === sq) {
          sqEl.classList.add('selected');
        }
        if (this.legalTargets.includes(sq)) {
          sqEl.classList.add('legal-dot');
        }
        if (inCheck && cell && cell.type === 'k' && cell.color === turn) {
          sqEl.classList.add('in-check');
        }

        if (c === 0) {
          sqEl.append(this.el('span', String(8 - r), 'coord-rank'));
        }
        if (r === 7) {
          sqEl.append(this.el('span', FILES[c], 'coord-file'));
        }

        if (cell) {
          const pieceToken = this.el(
            'span',
            PIECE_UNICODE[cell.color][cell.type],
            `piece-2d ${cell.color === 'w' ? 'pw' : 'pb'}`,
          );
          sqEl.append(pieceToken);
        }

        if (interactive && onSquareClick) {
          sqEl.addEventListener('click', () => onSquareClick(sq, cell));
        }
        boardEl.append(sqEl);
      }
    }
  }

  render() {
    this.overlay.replaceChildren();

    const header = this.el('div', '', 'learning-header');
    const titleWrap = this.el('div', '', 'learning-title-wrap');
    titleWrap.append(
      this.el('strong', 'Modo Aprendizado 2D (Vista de Cima)'),
      this.el('span', 'Peças planas, replay passo a passo, abertura e puzzles', 'muted-sm'),
    );

    const tabs = this.el('div', '', 'btn-row');
    const tabDefs = [
      ['replay', 'Revisão e Replay'],
      ['puzzles', 'Quebra-Cabeças'],
      ['guide', 'Ensino das Peças'],
    ];
    for (const [id, label] of tabDefs) {
      const b = this.el('button', label, this.activeTab === id ? 'primary' : '');
      b.addEventListener('click', () => {
        this.stopAutoReplay();
        this.activeTab = id;
        this.selectedSq = null;
        this.legalTargets = [];
        this.render();
      });
      tabs.append(b);
    }

    const btnBack = this.el('button', 'Voltar ao 3D', 'danger');
    btnBack.addEventListener('click', () => this.close());
    header.append(titleWrap, tabs, btnBack);

    const body = this.el('div', '', 'learning-body');
    const boardCol = this.el('div', '', 'learning-board-col');
    const evalBar = this.el('div', '', 'eval-bar');
    const evalFill = this.el('div', '', 'eval-fill');
    evalBar.append(evalFill);
    const board2d = this.el('div', '', 'board-2d');
    boardCol.append(evalBar, board2d);

    const sideCol = this.el('div', '', 'learning-side-col');

    if (this.activeTab === 'replay') {
      this.renderReplayTab(board2d, evalFill, sideCol);
    } else if (this.activeTab === 'puzzles') {
      this.renderPuzzlesTab(board2d, evalFill, sideCol);
    } else {
      this.renderGuideTab(board2d, evalFill, sideCol);
    }

    body.append(boardCol, sideCol);
    this.overlay.append(header, body);
  }

  renderReplayTab(board2d, evalFill, sideCol) {
    const { chess, lastMove } = this.getReplayChessAt(this.replayIndex);
    this.renderBoard2D(board2d, chess, { lastMove });

    const matScore = evaluateMaterial(chess);
    const pct = Math.max(10, Math.min(90, 50 + matScore * 4));
    evalFill.style.height = `${pct}%`;

    const opening = detectOpening(this.replayMoves.slice(0, this.replayIndex));
    const opCard = this.el('div', '', 'card');
    opCard.append(
      this.el('h2', `Abertura: ${opening.name}`),
      this.el('p', opening.tip),
      this.el('p', `Avaliação material: ${matScore >= 0 ? `+${matScore}` : matScore}`),
    );

    // Análise do lance atual
    const analysisCard = this.el('div', '', 'card');
    analysisCard.append(this.el('h2', 'Análise do Lance'));
    if (this.replayIndex > 0) {
      const prevState = this.getReplayChessAt(this.replayIndex - 1).chess;
      const beforeMat = evaluateMaterial(prevState);
      const afterMat = evaluateMaterial(chess);
      const moverColor = prevState.turn();
      const delta = moverColor === 'w' ? Math.max(0, beforeMat - afterMat) : Math.max(0, afterMat - beforeMat);
      const badge = classifyMoveDelta(delta);
      const best = !prevState.isGameOver() ? chooseAdaptiveMove(prevState.fen(), { depth: 2, randomFactor: 0 }) : null;

      analysisCard.append(
        this.el('p', `Lance ${this.replayIndex}: ${this.replayMoves[this.replayIndex - 1]}`),
        this.el('span', badge.label, `badge ${badge.cls}`),
        this.el('p', best ? `Sugestão do motor: ${best.san}` : 'Fim da análise.'),
      );
    } else {
      analysisCard.append(this.el('p', 'Posição inicial. Avance para analisar cada lance.'));
    }

    // Controles de Replay
    const ctrlRow = this.el('div', '', 'btn-row');
    const makeNavBtn = (lbl, fn) => {
      const b = this.el('button', lbl);
      b.addEventListener('click', () => {
        this.stopAutoReplay();
        fn();
        this.render();
      });
      return b;
    };
    const btnPlay = this.el('button', this.autoTimer ? 'Pausar' : 'Auto-Replay', 'primary');
    btnPlay.addEventListener('click', () => {
      if (this.autoTimer) {
        this.stopAutoReplay();
        this.render();
        return;
      }
      if (this.replayIndex >= this.replayMoves.length) this.replayIndex = 0;
      this.autoTimer = setInterval(() => {
        if (this.replayIndex < this.replayMoves.length) {
          this.replayIndex += 1;
          this.render();
        } else {
          this.stopAutoReplay();
          this.render();
        }
      }, 950);
      this.render();
    });

    ctrlRow.append(
      makeNavBtn('|<', () => { this.replayIndex = 0; }),
      makeNavBtn('<', () => { this.replayIndex = Math.max(0, this.replayIndex - 1); }),
      btnPlay,
      makeNavBtn('>', () => { this.replayIndex = Math.min(this.replayMoves.length, this.replayIndex + 1); }),
      makeNavBtn('>|', () => { this.replayIndex = this.replayMoves.length; }),
    );

    const movesBox = this.el('div', '', 'card');
    movesBox.append(this.el('h2', 'Lista de Lances (Clique para ir)'));
    const list = this.el('div', '', 'btn-row');
    this.replayMoves.forEach((san, i) => {
      const b = this.el('button', `${i + 1}.${san}`, this.replayIndex === i + 1 ? 'primary' : '');
      b.addEventListener('click', () => {
        this.stopAutoReplay();
        this.replayIndex = i + 1;
        this.render();
      });
      list.append(b);
    });
    movesBox.append(list);

    sideCol.append(opCard, analysisCard, ctrlRow, movesBox);
  }

  renderPuzzlesTab(board2d, evalFill, sideCol) {
    const pz = VERIFIED_PUZZLES[this.puzzleIndex];
    evalFill.style.height = '55%';

    const statusMsg = this.el('p', 'Clique na peça e depois na casa de destino para resolver.');

    const handlePuzzleClick = (sq, cell) => {
      if (this.selectedSq && this.legalTargets.includes(sq)) {
        const isCorrect = this.selectedSq === pz.solutionFrom && sq === pz.solutionTo;
        if (isCorrect) {
          this.puzzleChess.move({ from: this.selectedSq, to: sq, promotion: 'q' });
          this.selectedSq = null;
          this.legalTargets = [];
          this.render();
          if (this.onNarrate) this.onNarrate(`Correto! ${pz.explanation}`);
          return;
        }
        statusMsg.textContent = 'Lance incorreto! Tente outra ideia ou clique em Dica.';
        this.selectedSq = null;
        this.legalTargets = [];
        this.renderBoard2D(board2d, this.puzzleChess, { interactive: true, onSquareClick: handlePuzzleClick });
        return;
      }

      if (cell && cell.color === this.puzzleChess.turn()) {
        this.selectedSq = sq;
        this.legalTargets = this.puzzleChess.moves({ square: sq, verbose: true }).map((m) => m.to);
      } else {
        this.selectedSq = null;
        this.legalTargets = [];
      }
      this.renderBoard2D(board2d, this.puzzleChess, { interactive: true, onSquareClick: handlePuzzleClick });
    };

    this.renderBoard2D(board2d, this.puzzleChess, { interactive: true, onSquareClick: handlePuzzleClick });

    const card = this.el('div', '', 'card');
    const solved = this.puzzleChess.isCheckmate() || (this.puzzleChess.history().length > 0);
    card.append(
      this.el('h2', `${pz.title} (${pz.difficulty})`),
      solved ? this.el('p', `Resolvido! ${pz.explanation}`) : statusMsg,
    );

    const row = this.el('div', '', 'btn-row');
    const btnHint = this.el('button', 'Dica');
    btnHint.addEventListener('click', () => {
      statusMsg.textContent = `Dica: ${pz.hint}`;
    });
    const btnReset = this.el('button', 'Reiniciar');
    btnReset.addEventListener('click', () => {
      this.loadPuzzle(this.puzzleIndex);
      this.render();
    });
    const btnNext = this.el('button', 'Próximo Puzzle', 'primary');
    btnNext.addEventListener('click', () => {
      this.loadPuzzle(this.puzzleIndex + 1);
      this.render();
    });
    row.append(btnHint, btnReset, btnNext);

    sideCol.append(card, row);
  }

  renderGuideTab(board2d, evalFill, sideCol) {
    evalFill.style.height = '50%';
    const chess = new Chess('8/8/8/8/8/8/8/8 w - - 0 1');
    chess.put({ type: this.guidePieceType, color: 'w' }, 'd4');
    this.selectedSq = 'd4';
    this.legalTargets = chess.moves({ square: 'd4', verbose: true }).map((m) => m.to);
    this.renderBoard2D(board2d, chess, {});

    const info = PIECE_TEACHING_GUIDE[this.guidePieceType];
    const card = this.el('div', '', 'card');
    card.append(
      this.el('h2', `${info.name} — ${info.value}`),
      this.el('p', info.summary),
      this.el('p', `Dica: ${info.tip}`),
    );

    const btnRow = this.el('div', '', 'btn-row');
    for (const [code, data] of Object.entries(PIECE_TEACHING_GUIDE)) {
      const b = this.el('button', data.name, this.guidePieceType === code ? 'primary' : '');
      b.addEventListener('click', () => {
        this.guidePieceType = code;
        this.render();
      });
      btnRow.append(b);
    }

    sideCol.append(btnRow, card);
  }
}
