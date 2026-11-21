import * as THREE from 'three';
import { PlayerObject } from 'skinview3d';

const SKIN_TEX_CACHE = new Map();
const BASE_GEO = new THREE.CylinderGeometry(0.36, 0.4, 0.12, 16);
const RIM_GEO = new THREE.TorusGeometry(0.39, 0.022, 8, 24);

function hexToCss(hex) {
  return `#${Number(hex).toString(16).padStart(6, '0')}`;
}

function getRoleColorHex(type, color, palette) {
  const pc = palette?.pieceColors || {};
  const isW = color === 'w';
  switch (type) {
    case 'k':
      return isW ? (pc.kingW ?? 0xfbbf24) : (pc.kingB ?? 0xd97706);
    case 'q':
      return isW ? (pc.queenW ?? 0xa855f7) : (pc.queenB ?? 0xc026d3);
    case 'b':
      return isW ? (pc.bishopW ?? 0x0284c7) : (pc.bishopB ?? 0x38bdf8);
    case 'n':
      return isW ? (pc.knightW ?? 0xb45309) : (pc.knightB ?? 0xea580c);
    case 'r':
      return isW ? (pc.rookW ?? 0x64748b) : (pc.rookB ?? 0x94a3b8);
    default:
      return isW ? (pc.wAccent ?? 0xd4af37) : (pc.bAccent ?? 0x9b2c2c);
  }
}

function createProceduralSkinTexture(type, color, palette) {
  const paletteId = palette?.id || 'normal';
  const cacheKey = `${paletteId}_${type}_${color}`;
  if (SKIN_TEX_CACHE.has(cacheKey)) {
    return SKIN_TEX_CACHE.get(cacheKey);
  }

  const pc = palette?.pieceColors || {};
  const mainHex = color === 'w' ? (pc.w ?? 0xf0ead6) : (pc.b ?? 0x262936);
  const accentHex = getRoleColorHex(type, color, palette);
  const eyeHex = color === 'w' ? (pc.eyeW ?? 0x38bdf8) : (pc.eyeB ?? 0xf97316);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Corpo base (skin 64x64)
  ctx.fillStyle = hexToCss(mainHex);
  ctx.fillRect(0, 0, 64, 64);

  // Detalhes de armadura / manto / coroa (accent)
  ctx.fillStyle = hexToCss(accentHex);
  // Faixa no torso (x:16..40, y:16..32)
  ctx.fillRect(16, 20, 24, 10);
  // Ombreiras nos braços (x:40..56, y:16..24) e (x:32..48, y:48..56)
  ctx.fillRect(40, 16, 16, 6);
  ctx.fillRect(32, 48, 16, 6);
  // Botas nas pernas (x:0..16, y:26..32) e (x:16..32, y:58..64)
  ctx.fillRect(0, 26, 16, 6);
  ctx.fillRect(16, 58, 16, 6);

  // Elmo / Coroa na cabeça (camada 1 + camada 2)
  ctx.fillRect(0, 8, 32, 3);
  if (type === 'k' || type === 'q') {
    ctx.fillRect(32, 0, 32, 10);
  } else if (type === 'b') {
    ctx.fillRect(8, 0, 8, 8);
  }

  // Rosto frontal da cabeça (x:8..16, y:8..16)
  ctx.fillStyle = hexToCss(mainHex);
  ctx.fillRect(8, 11, 8, 5);

  // Olhos brilhantes
  ctx.fillStyle = hexToCss(eyeHex);
  ctx.fillRect(9, 12, 2, 2);
  ctx.fillRect(13, 12, 2, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  SKIN_TEX_CACHE.set(cacheKey, texture);
  return texture;
}

/**
 * Constrói uma peça articulada usando skinview3d para o Modo Animado.
 */
export function buildSkinviewPiece(type, color, palette, materials) {
  const root = new THREE.Group();
  const mainMat = materials[color];
  const accentMat = materials[
    type === 'k'
      ? color === 'w' ? 'kingW' : 'kingB'
      : type === 'q'
        ? color === 'w' ? 'queenW' : 'queenB'
        : type === 'b'
          ? color === 'w' ? 'bishopW' : 'bishopB'
          : type === 'n'
            ? color === 'w' ? 'knightW' : 'knightB'
            : type === 'r'
              ? color === 'w' ? 'rookW' : 'rookB'
              : color === 'w' ? 'wAccent' : 'bAccent'
  ];

  const base = new THREE.Mesh(BASE_GEO, mainMat);
  base.position.y = 0.06;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  const baseRim = new THREE.Mesh(RIM_GEO, accentMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = 0.025;
  root.add(baseRim);

  const player = new PlayerObject();
  const tex = createProceduralSkinTexture(type, color, palette);
  player.skin.layer1Material.map = tex;
  player.skin.layer1Material.needsUpdate = true;
  player.skin.layer2Material.map = tex;
  player.skin.layer2Material.needsUpdate = true;

  const scaleFactor = type === 'k' ? 0.036 : type === 'q' ? 0.034 : type === 'p' ? 0.028 : 0.031;
  player.scale.setScalar(scaleFactor);
  player.position.y = 0.54 * (scaleFactor / 0.031);
  // No skinview3d o personagem olha para +Z por padrão
  root.add(player);

  // Face das peças brancas olha para -Z e pretas para +Z
  root.rotation.y = color === 'w' ? Math.PI : 0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  root.userData = {
    type,
    color,
    state: 'idle',
    phase: Math.random() * Math.PI * 2,
    isSkinview: true,
    skinPlayer: player,
    parts: {
      body: player.skin.body,
      head: player.skin.head,
      rightArm: player.skin.rightArm,
      leftArm: player.skin.leftArm,
    },
  };

  return root;
}
