/**
 * Gerador de identificador único HWID e hash SHA-256.
 * Usa Web Crypto API e sinais do navegador sem coletar dados pessoais.
 */

const HWID_STORAGE_KEY = 'mchess_hwid_hash';
const HWID_SALT_KEY = 'mchess_hwid_salt';

/**
 * Gera uma assinatura leve de Canvas e WebGL para compor o HWID.
 * @returns {string}
 */
function collectHardwareSignals() {
  const parts = [
    typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
    typeof navigator !== 'undefined' ? navigator.language : 'pt-BR',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0',
  ];

  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px sans-serif';
        ctx.fillText('MChess-HWID-v1', 2, 2);
        parts.push(canvas.toDataURL().slice(-48));
      }
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const renderer = gl.getParameter(gl.RENDERER);
        if (renderer) parts.push(String(renderer));
      }
    }
  } catch {
    parts.push('canvas-unavailable');
  }

  return parts.join('|');
}

/**
 * Calcula SHA-256 em hexadecimal.
 * @param {string} input
 * @returns {Promise<string>}
 */
export async function computeSha256(input) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback determinístico para ambientes sem Web Crypto (ex: HTTP inseguro)
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
}

/**
 * Obtém ou cria o hash HWID persistente do jogador.
 * @returns {Promise<string>}
 */
export async function getOrCreateHwidHash() {
  try {
    const existing = localStorage.getItem(HWID_STORAGE_KEY);
    if (existing && /^[a-f0-9]{64}$/i.test(existing)) {
      return existing;
    }
    let salt = localStorage.getItem(HWID_SALT_KEY);
    if (!salt) {
      salt = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(HWID_SALT_KEY, salt);
    }
    const raw = `${collectHardwareSignals()}|${salt}`;
    const hash = await computeSha256(raw);
    localStorage.setItem(HWID_STORAGE_KEY, hash);
    return hash;
  } catch {
    return computeSha256(collectHardwareSignals());
  }
}

/**
 * Define manualmente um hash HWID para recuperar sessão de outro navegador.
 * @param {string} hash
 */
export function setActiveHwidHash(hash) {
  const clean = hash.trim().toLowerCase();
  localStorage.setItem(HWID_STORAGE_KEY, clean);
  return clean;
}
