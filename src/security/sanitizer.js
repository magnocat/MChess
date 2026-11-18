/**
 * Módulo de sanitização e validação de entradas.
 * Padrão ASD-STE100: frases curtas, voz ativa, termos consistentes.
 */

const VALID_SQUARE_RE = /^[a-h][1-8]$/;
const VALID_PROMOTION_RE = /^[qrbn]$/;
const VALID_HASH_RE = /^[a-f0-9]{16,64}$/i;

/**
 * Remove caracteres perigosos para evitar XSS em textos exibidos na tela.
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(value, maxLength = 120) {
  if (typeof value !== 'string') {
    return '';
  }
  return Array.from(value.replace(/[<>`"'&\\]/g, ''))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

/**
 * Valida uma casa do tabuleiro (a1 até h8).
 * @param {unknown} square
 * @returns {boolean}
 */
export function isValidSquare(square) {
  return typeof square === 'string' && VALID_SQUARE_RE.test(square);
}

/**
 * Valida a peça de promoção do peão.
 * @param {unknown} promotion
 * @returns {boolean}
 */
export function isValidPromotion(promotion) {
  return typeof promotion === 'string' && VALID_PROMOTION_RE.test(promotion);
}

/**
 * Valida um hash SHA-256 ou prefixo de HWID.
 * @param {unknown} hash
 * @returns {boolean}
 */
export function isValidHwidHash(hash) {
  return typeof hash === 'string' && VALID_HASH_RE.test(hash.trim());
}

/**
 * Valida um objeto de arquivo .txt importado antes de aplicar no jogo.
 * Rejeita protótipos poluídos e campos inválidos.
 * @param {string} rawText
 * @returns {object}
 */
export function parseSafeTxtPayload(rawText) {
  if (typeof rawText !== 'string' || rawText.length > 512_000) {
    throw new Error('Arquivo .txt inválido ou maior que 512 KB.');
  }

  const lines = rawText.split(/\r?\n/);
  const jsonLine = lines.find((line) => line.startsWith('PAYLOAD_JSON='));
  const rawJson = jsonLine ? jsonLine.slice('PAYLOAD_JSON='.length) : rawText;

  const parsed = JSON.parse(rawJson);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Estrutura JSON inválida no arquivo .txt.');
  }

  if (Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
      Object.prototype.hasOwnProperty.call(parsed, 'constructor')) {
    throw new Error('Conteúdo bloqueado por segurança.');
  }

  return parsed;
}
