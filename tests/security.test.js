import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  isValidSquare,
  isValidHwidHash,
  parseSafeTxtPayload,
} from '../src/security/sanitizer.js';
import { AdminAuthManager } from '../src/security/adminAuth.js';

describe('Segurança e Sanitização', () => {
  it('remove tags e caracteres perigosos contra XSS', () => {
    const dirty = '<script>alert("xss")</script>Miguel';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).toContain('Miguel');
  });

  it('valida casas do tabuleiro e hashes HWID', () => {
    expect(isValidSquare('e4')).toBe(true);
    expect(isValidSquare('z9')).toBe(false);
    expect(isValidHwidHash('abcdef1234567890')).toBe(true);
    expect(isValidHwidHash('<script>')).toBe(false);
  });

  it('bloqueia prototype pollution em arquivos .txt importados', () => {
    const malicious = 'PAYLOAD_JSON={"__proto__":{"admin":true}}';
    expect(() => parseSafeTxtPayload(malicious)).toThrow();
  });

  it('autentica ADMIN via SHA-256 e bloqueia após 5 falhas', async () => {
    const auth = new AdminAuthManager();
    const expected = await auth.sha256('senha-secreta-teste');
    const customAuth = new AdminAuthManager(expected);

    for (let i = 0; i < 5; i += 1) {
      const fail = await customAuth.login('errada', 1000);
      expect(fail.ok).toBe(false);
    }

    const locked = await customAuth.login('senha-secreta-teste', 2000);
    expect(locked.ok).toBe(false);
    expect(locked.reason).toContain('bloqueado');

    const okAfterWait = await customAuth.login('senha-secreta-teste', 70_000);
    expect(okAfterWait.ok).toBe(true);
  });
});
