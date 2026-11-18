import { describe, it, expect, beforeEach } from 'vitest';
import { AccessibilityManager, COLOR_MODES } from '../src/accessibility/accessibilityManager.js';
import { ChessEngine } from '../src/core/chessEngine.js';

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('AccessibilityManager', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage();
  });

  it('suporta todos os 5 modos de cor e persiste por HWID', () => {
    expect(COLOR_MODES.map((m) => m.id)).toEqual([
      'normal',
      'protanopia',
      'deuteranopia',
      'tritanopia',
      'achromatopsia',
    ]);

    const a11yA = new AccessibilityManager('hwid-alpha');
    a11yA.setColorMode('tritanopia');
    a11yA.setBlindNarrated(true);

    // Nova instância com o mesmo HWID deve restaurar as preferências
    const a11yReloaded = new AccessibilityManager('hwid-alpha');
    expect(a11yReloaded.colorMode).toBe('tritanopia');
    expect(a11yReloaded.blindNarrated).toBe(true);
    expect(a11yReloaded.getPalette().id).toBe('tritanopia');

    // HWID diferente permanece com padrão
    const a11yB = new AccessibilityManager('hwid-beta');
    expect(a11yB.colorMode).toBe('normal');
    expect(a11yB.blindNarrated).toBe(false);
  });

  it('navega pelo cursor dentro dos limites do tabuleiro (a1..h8)', () => {
    const a11y = new AccessibilityManager('hwid-nav');
    expect(a11y.getCursorSquare()).toBe('e2');

    a11y.moveCursor(1, 2);
    expect(a11y.getCursorSquare()).toBe('f4');

    a11y.moveCursor(-20, -20);
    expect(a11y.getCursorSquare()).toBe('a1');

    a11y.moveCursor(20, 20);
    expect(a11y.getCursorSquare()).toBe('h8');
  });

  it('descreve casas vazias e peças com seus lances legais em PT-BR', () => {
    const a11y = new AccessibilityManager('hwid-desc');
    const engine = new ChessEngine();

    const emptyDesc = a11y.describeSquare(engine, 'e4');
    expect(emptyDesc).toContain('Casa e4: vazia.');

    const pawnDesc = a11y.describeSquare(engine, 'e2');
    expect(pawnDesc).toContain('Casa e2: Peão Branco.');
    expect(pawnDesc).toContain('2 lances possíveis: e3, e4.');
  });
});
