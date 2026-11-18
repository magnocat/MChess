import { parseSafeTxtPayload, sanitizeText } from '../security/sanitizer.js';

const SAVE_PREFIX = 'mchess_save_';
const PROFILE_PREFIX = 'mchess_profile_';

/**
 * Formata um objeto de estado em texto puro (.txt) legível por humanos e máquinas.
 * @param {string} type - 'MATCH' | 'PROFILE' | 'SCOREBOARD'
 * @param {string} hwidHash
 * @param {object} payload
 * @returns {string}
 */
export function formatTxtRecord(type, hwidHash, payload) {
  const safeType = sanitizeText(type, 24) || 'MATCH';
  const safeHwid = sanitizeText(hwidHash, 64);
  const lines = [
    '# MCHESS - REGISTRO EM TEXTO PURO (ASD-STE100)',
    `TIPO=${safeType}`,
    `HWID_HASH=${safeHwid}`,
    `ATUALIZADO_EM=${new Date().toISOString()}`,
    `PAYLOAD_JSON=${JSON.stringify(payload)}`,
  ];
  return lines.join('\n') + '\n';
}

/**
 * Salva o estado da partida em texto puro no armazenamento local.
 * @param {string} hwidHash
 * @param {object} matchSnapshot
 */
export function saveMatchTxt(hwidHash, matchSnapshot) {
  const txt = formatTxtRecord('MATCH', hwidHash, matchSnapshot);
  try {
    localStorage.setItem(`${SAVE_PREFIX}${hwidHash}`, txt);
  } catch {
    // Ignora falha de cota em modo privado
  }
  return txt;
}

/**
 * Carrega o estado da partida associado ao hash HWID.
 * @param {string} hwidHash
 * @returns {object|null}
 */
export function loadMatchTxt(hwidHash) {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${hwidHash}`);
    if (!raw) return null;
    return parseSafeTxtPayload(raw);
  } catch {
    return null;
  }
}

/**
 * Salva o perfil adaptativo da IA em texto puro.
 * @param {string} hwidHash
 * @param {object} profile
 */
export function saveProfileTxt(hwidHash, profile) {
  const txt = formatTxtRecord('PROFILE', hwidHash, profile);
  try {
    localStorage.setItem(`${PROFILE_PREFIX}${hwidHash}`, txt);
  } catch {
    // Ignora falha de cota
  }
  return txt;
}

/**
 * Carrega o perfil adaptativo da IA pelo hash HWID.
 * @param {string} hwidHash
 * @returns {object|null}
 */
export function loadProfileTxt(hwidHash) {
  try {
    const raw = localStorage.getItem(`${PROFILE_PREFIX}${hwidHash}`);
    if (!raw) return null;
    return parseSafeTxtPayload(raw);
  } catch {
    return null;
  }
}

/**
 * Dispara o download de um arquivo .txt no navegador.
 * @param {string} filename
 * @param {string} content
 */
export function downloadTxtFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
