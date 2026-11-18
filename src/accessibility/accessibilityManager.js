/**
 * Gerenciador de Acessibilidade e Inclusão (Daltonismo + Modo Narrado para Cegos).
 * Persiste as preferências vinculadas ao HWID em texto puro.
 */

export const COLOR_MODES = [
  {
    id: 'normal',
    label: 'Padrão (Cores Originais)',
    legalColor: 0x22c55e,
    captureColor: 0xef4444,
    selectedColor: 0xfacc15,
    boardLight: null,
    boardDark: null,
    pieceColors: {
      w: 0xf0ead6,
      wAccent: 0xd4af37,
      b: 0x262936,
      bAccent: 0x9b2c2c,
      kingW: 0xfbbf24,
      kingB: 0xd97706,
      queenW: 0xa855f7,
      queenB: 0xc026d3,
      bishopW: 0x0284c7,
      bishopB: 0x38bdf8,
      knightW: 0xb45309,
      knightB: 0xea580c,
      rookW: 0x64748b,
      rookB: 0x94a3b8,
      eyeW: 0x38bdf8,
      eyeB: 0xf97316,
    },
  },
  {
    id: 'protanopia',
    label: 'Protanopia (Sem Vermelho — Azul / Amarelo)',
    legalColor: 0x38bdf8,
    captureColor: 0xfacc15,
    selectedColor: 0xffffff,
    boardLight: 0xfef9c3,
    boardDark: 0x1e3a8a,
    pieceColors: {
      w: 0xfef08a,
      wAccent: 0xffffff,
      b: 0x0f172a,
      bAccent: 0x38bdf8,
      kingW: 0xffffff,
      kingB: 0x60a5fa,
      queenW: 0xfde047,
      queenB: 0x38bdf8,
      bishopW: 0xbae6fd,
      bishopB: 0x2563eb,
      knightW: 0xfacc15,
      knightB: 0x0284c7,
      rookW: 0xe2e8f0,
      rookB: 0x1d4ed8,
      eyeW: 0x0284c7,
      eyeB: 0xfacc15,
    },
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia (Sem Verde — Azul / Laranja)',
    legalColor: 0x0ea5e9,
    captureColor: 0xf97316,
    selectedColor: 0xfef08a,
    boardLight: 0xffedd5,
    boardDark: 0x1d4ed8,
    pieceColors: {
      w: 0xfef3c7,
      wAccent: 0xf97316,
      b: 0x1e1b4b,
      bAccent: 0x38bdf8,
      kingW: 0xfb923c,
      kingB: 0x60a5fa,
      queenW: 0xfdba74,
      queenB: 0x38bdf8,
      bishopW: 0xea580c,
      bishopB: 0x0ea5e9,
      knightW: 0xf59e0b,
      knightB: 0x2563eb,
      rookW: 0xfed7aa,
      rookB: 0x0284c7,
      eyeW: 0x0ea5e9,
      eyeB: 0xfb923c,
    },
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia (Sem Azul/Amarelo — Ciano / Rosa)',
    legalColor: 0x2dd4bf,
    captureColor: 0xf43f5e,
    selectedColor: 0xffffff,
    boardLight: 0xfce7f3,
    boardDark: 0x0f766e,
    pieceColors: {
      w: 0xfdf2f8,
      wAccent: 0xf43f5e,
      b: 0x134e4a,
      bAccent: 0x2dd4bf,
      kingW: 0xfb7185,
      kingB: 0x5eead4,
      queenW: 0xf43f5e,
      queenB: 0x2dd4bf,
      bishopW: 0xfda4af,
      bishopB: 0x14b8a6,
      knightW: 0xe11d48,
      knightB: 0x0d9488,
      rookW: 0xfbcfe8,
      rookB: 0x99f6e4,
      eyeW: 0x2dd4bf,
      eyeB: 0xfb7185,
    },
  },
  {
    id: 'achromatopsia',
    label: 'Acromatopsia (Alto Contraste Monocromático)',
    legalColor: 0xffffff,
    captureColor: 0x94a3b8,
    selectedColor: 0xf8fafc,
    boardLight: 0xcbd5e1,
    boardDark: 0x475569,
    pieceColors: {
      w: 0xffffff,
      wAccent: 0x334155,
      b: 0x090d16,
      bAccent: 0xf1f5f9,
      kingW: 0x1e293b,
      kingB: 0xffffff,
      queenW: 0x334155,
      queenB: 0xf1f5f9,
      bishopW: 0x475569,
      bishopB: 0xe2e8f0,
      knightW: 0x1e293b,
      knightB: 0xcbd5e1,
      rookW: 0x334155,
      rookB: 0xf8fafc,
      eyeW: 0x090d16,
      eyeB: 0xffffff,
    },
  },
];

const PIECE_NAMES_PT = {
  p: 'Peão',
  r: 'Torre',
  n: 'Cavalo',
  b: 'Bispo',
  q: 'Rainha',
  k: 'Rei',
};

const A11Y_PREFIX = 'mchess_a11y_';

export class AccessibilityManager {
  constructor(hwidHash) {
    this.hwidHash = hwidHash;
    this.colorMode = 'normal';
    this.blindNarrated = false;
    this.cursorFile = 4; // 'e'
    this.cursorRank = 2; // '2'
    this.load(hwidHash);
  }

  setHwid(hwidHash) {
    this.hwidHash = hwidHash;
    this.load(hwidHash);
  }

  load(hwidHash) {
    try {
      const raw = localStorage.getItem(`${A11Y_PREFIX}${hwidHash}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.colorMode = COLOR_MODES.some((m) => m.id === parsed.colorMode) ? parsed.colorMode : 'normal';
        this.blindNarrated = Boolean(parsed.blindNarrated);
      }
    } catch {
      this.colorMode = 'normal';
      this.blindNarrated = false;
    }
    this.applyDomTheme();
  }

  save() {
    try {
      localStorage.setItem(
        `${A11Y_PREFIX}${this.hwidHash}`,
        JSON.stringify({
          colorMode: this.colorMode,
          blindNarrated: this.blindNarrated,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignora falha de armazenamento
    }
  }

  setColorMode(modeId) {
    if (!COLOR_MODES.some((m) => m.id === modeId)) return;
    this.colorMode = modeId;
    this.applyDomTheme();
    this.save();
  }

  setBlindNarrated(enabled) {
    this.blindNarrated = Boolean(enabled);
    this.save();
  }

  getPalette() {
    return COLOR_MODES.find((m) => m.id === this.colorMode) || COLOR_MODES[0];
  }

  applyDomTheme() {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-color-mode', this.colorMode);
    }
  }

  getCursorSquare() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return `${files[this.cursorFile]}${this.cursorRank}`;
  }

  moveCursor(df, dr) {
    this.cursorFile = Math.max(0, Math.min(7, this.cursorFile + df));
    this.cursorRank = Math.max(1, Math.min(8, this.cursorRank + dr));
    return this.getCursorSquare();
  }

  /**
   * Gera descrição falada completa de uma casa e seus movimentos possíveis.
   */
  describeSquare(engine, square) {
    const piece = engine.getPieceAt(square);
    if (!piece) {
      return `Casa ${square}: vazia.`;
    }
    const name = PIECE_NAMES_PT[piece.type] || 'Peça';
    const color = piece.color === 'w' ? 'Branco' : 'Preto';
    const moves = engine.getLegalMoves(square);

    if (moves.length === 0) {
      return `Casa ${square}: ${name} ${color}. Sem movimentos legais agora.`;
    }

    const destList = moves
      .slice(0, 6)
      .map((m) => (m.captured ? `captura em ${m.to}` : m.to))
      .join(', ');
    const extra = moves.length > 6 ? ` e mais ${moves.length - 6}` : '';
    return `Casa ${square}: ${name} ${color}. ${moves.length} lances possíveis: ${destList}${extra}.`;
  }

  /**
   * Narra um texto via Web Speech API com prioridade para acessibilidade.
   */
  narrate(text, onSubtitle = null) {
    if (onSubtitle) onSubtitle(text);
    if (!this.blindNarrated) return text;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return text;

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      u.rate = 1.05;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {
      // Silencioso se TTS estiver indisponível
    }
    return text;
  }
}
