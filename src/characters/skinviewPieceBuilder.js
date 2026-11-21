import * as THREE from 'three';
import { PlayerObject } from 'skinview3d';

const SKIN_TEX_CACHE = new Map();
const BASE_GEO = new THREE.CylinderGeometry(0.36, 0.4, 0.12, 16);
const RIM_GEO = new THREE.TorusGeometry(0.39, 0.022, 8, 24);

function hexToCss(hex) {
  return `#${Number(hex).toString(16).padStart(6, '0')}`;
}

function shadeHex(hex, factor) {
  const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((hex & 0xff) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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

/**
 * Gera uma skin Minecraft 64x64 detalhada para cada tipo de peça de xadrez.
 */
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

  const mainCss = hexToCss(mainHex);
  const darkCss = shadeHex(mainHex, 0.78);
  const accentCss = hexToCss(accentHex);
  const accentLightCss = shadeHex(accentHex, 1.2);
  const eyeCss = hexToCss(eyeHex);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Fundo principal da skin 64x64
  ctx.fillStyle = mainCss;
  ctx.fillRect(0, 0, 64, 64);

  // Sombreado sutil nas costas/laterais do torso e membros
  ctx.fillStyle = darkCss;
  ctx.fillRect(28, 20, 12, 12); // costas do torso
  ctx.fillRect(0, 20, 16, 12); // perna dir base
  ctx.fillRect(16, 52, 16, 12); // perna esq base

  // Armadura / Túnica por função
  ctx.fillStyle = accentCss;
  ctx.fillRect(16, 20, 24, 10); // peitoral e costas
  ctx.fillRect(40, 16, 16, 7); // ombreiras braço dir
  ctx.fillRect(32, 48, 16, 7); // ombreiras braço esq
  ctx.fillRect(0, 27, 16, 5); // botas dir
  ctx.fillRect(16, 59, 16, 5); // botas esq

  // Cinto e emblema frontal no peito (x:20..28, y:20..32)
  ctx.fillStyle = accentLightCss;
  ctx.fillRect(20, 27, 8, 2);
  ctx.fillRect(23, 21, 2, 5);

  // Cabeça (frente em x:8..16, y:8..16)
  ctx.fillStyle = mainCss;
  ctx.fillRect(8, 8, 8, 8);

  // Detalhes exclusivos por peça no rosto e elmo/coroa (camada 1 e 2)
  if (type === 'k') {
    // Rei: coroa alta dourada com pontas e barba real
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 8, 32, 3);
    ctx.fillRect(40, 8, 8, 3); // camada 2 frente
    ctx.fillStyle = accentLightCss;
    ctx.fillRect(40, 7, 2, 2);
    ctx.fillRect(43, 6, 2, 3);
    ctx.fillRect(46, 7, 2, 2);
    ctx.fillStyle = darkCss;
    ctx.fillRect(9, 14, 6, 2); // barba
  } else if (type === 'q') {
    // Rainha: tiara real com gema central brilhante
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 8, 32, 2);
    ctx.fillRect(40, 7, 8, 3);
    ctx.fillStyle = eyeCss;
    ctx.fillRect(43, 7, 2, 2);
  } else if (type === 'b') {
    // Bispo: mitra alta pontuda
    ctx.fillStyle = accentCss;
    ctx.fillRect(8, 0, 8, 8);
    ctx.fillRect(40, 6, 8, 4);
    ctx.fillStyle = accentLightCss;
    ctx.fillRect(11, 9, 2, 2);
  } else if (type === 'n') {
    // Cavalo: viseira de cavaleiro + crina lateral
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 8, 32, 3);
    ctx.fillRect(8, 10, 2, 6);
    ctx.fillRect(14, 10, 2, 6);
    ctx.fillStyle = accentLightCss;
    ctx.fillRect(11, 8, 2, 5);
  } else if (type === 'r') {
    // Torre: elmo com ameias de fortaleza
    ctx.fillStyle = accentCss;
    ctx.fillRect(8, 8, 2, 2);
    ctx.fillRect(11, 8, 2, 2);
    ctx.fillRect(14, 8, 2, 2);
    ctx.fillRect(40, 8, 8, 2);
  } else {
    // Peão: capacete simples de soldado
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 8, 32, 2);
  }

  // Olhos brilhantes no rosto (x:8..16, y:12)
  ctx.fillStyle = eyeCss;
  ctx.fillRect(9, 12, 2, 2);
  ctx.fillRect(13, 12, 2, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
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
  root.add(player);

  // Face das peças brancas olha para -Z e pretas para +Z
  root.rotation.y = color === 'w' ? Math.PI : 0;

  // Compatibilidade com Three.js r170+ (skinview3d usa Three.js 0.156 internamente)
  root.traverse((child) => {
    if (typeof child.onBeforeShadow !== 'function') {
      child.onBeforeShadow = () => {};
    }
    if (typeof child.onAfterShadow !== 'function') {
      child.onAfterShadow = () => {};
    }
    if (typeof child.onBeforeRender !== 'function') {
      child.onBeforeRender = () => {};
    }
    if (typeof child.onAfterRender !== 'function') {
      child.onAfterRender = () => {};
    }
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
