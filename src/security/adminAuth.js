/**
 * Módulo de autenticação exclusiva do ADMIN.
 * Compara o hash SHA-256 da senha sem expor a senha no código.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export class AdminAuthManager {
  constructor(expectedHash = null) {
    const envHash =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_PASS_HASH
        ? String(import.meta.env.VITE_ADMIN_PASS_HASH).trim()
        : '';
    this.expectedHash = expectedHash || envHash || null;
    this.failedAttempts = 0;
    this.lockedUntil = 0;
    this.authenticated = false;
  }

  isConfigured() {
    return typeof this.expectedHash === 'string' && /^[a-f0-9]{64}$/i.test(this.expectedHash);
  }

  /**
   * Calcula o hash SHA-256 em hexadecimal usando Web Crypto API.
   * @param {string} text
   * @returns {Promise<string>}
   */
  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifica se o acesso está bloqueado por excesso de tentativas.
   * @param {number} now
   * @returns {boolean}
   */
  isLocked(now = Date.now()) {
    return now < this.lockedUntil;
  }

  /**
   * Valida a senha do ADMIN com proteção contra força bruta.
   * @param {string} password
   * @param {number} now
   * @returns {Promise<{ok: boolean, reason?: string}>}
   */
  async login(password, now = Date.now()) {
    if (!this.isConfigured()) {
      return {
        ok: false,
        reason: 'Acesso ADMIN bloqueado. Configure VITE_ADMIN_PASS_HASH nos Segredos do GitHub ou em .env.local.',
      };
    }

    if (this.isLocked(now)) {
      const waitSec = Math.ceil((this.lockedUntil - now) / 1000);
      return { ok: false, reason: `Acesso bloqueado. Aguarde ${waitSec}s.` };
    }

    if (typeof password !== 'string' || password.length === 0) {
      return { ok: false, reason: 'Informe a senha de administrador.' };
    }

    const digest = await this.sha256(password);
    if (digest === this.expectedHash.toLowerCase()) {
      this.failedAttempts = 0;
      this.lockedUntil = 0;
      this.authenticated = true;
      return { ok: true };
    }

    this.failedAttempts += 1;
    if (this.failedAttempts >= MAX_ATTEMPTS) {
      this.lockedUntil = now + LOCKOUT_MS;
      return { ok: false, reason: 'Muitas tentativas. Bloqueio de 60s ativado.' };
    }

    return {
      ok: false,
      reason: `Senha incorreta. Tentativas restantes: ${MAX_ATTEMPTS - this.failedAttempts}.`,
    };
  }

  logout() {
    this.authenticated = false;
  }
}
