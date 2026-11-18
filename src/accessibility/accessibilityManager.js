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
  },
  {
    id: 'protanopia',
    label: 'Protanopia (Sem Vermelho — Azul / Amarelo)',
    legalColor: 0x38bdf8,
    captureColor: 0xfacc15,
    selectedColor: 0xffffff,
    boardLight: 0xfef9c3,
    boardDark: 0x1e3a8a,
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia (Sem Verde — Azul / Laranja)',
    legalColor: 0x0ea5e9,
    captureColor: 0xf97316,
    selectedColor: 0xfef08a,
    boardLight: 0xffedd5,
    boardDark: 0x1d4ed8,
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia (Sem Azul/Amarelo — Ciano / Rosa)',
    legalColor: 0x2dd4bf,
    captureColor: 0xf43f5e,
    selectedColor: 0xffffff,
    boardLight: 0xfce7f3,
    boardDark: 0x0f766e,
  },
  {
    id: 'achromatopsia',
    label: 'Acromatopsia (Alto Contraste Monocromático)',
    legalColor: 0xffffff,
    captureColor: 0x94a3b8,
    selectedColor: 0xf8fafc,
    boardLight: 0xf8fafc,
    boardDark: 0x0f172a,
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
