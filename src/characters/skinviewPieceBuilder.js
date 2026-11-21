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

function getAccentMaterial(type, color, materials) {
  const isW = color === 'w';
  switch (type) {
    case 'k':
      return isW ? materials.kingW : materials.kingB;
    case 'q':
      return isW ? materials.queenW : materials.queenB;
    case 'b':
      return isW ? materials.bishopW : materials.bishopB;
    case 'n':
      return isW ? materials.knightW : materials.knightB;
    case 'r':
      return isW ? materials.rookW : materials.rookB;
    default:
      return isW ? materials.wAccent : materials.bAccent;
  }
}

/**
 * Cria textura pixel-art estilo Minecraft (tijolos de pedra para Torre, pelagem para Cavalo, ou skin 64x64).
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
  const darkCss = shadeHex(mainHex, 0.75);
  const lightCss = shadeHex(mainHex, 1.15);
  const accentCss = hexToCss(accentHex);
  const accentLightCss = shadeHex(accentHex, 1.2);
  const eyeCss = hexToCss(eyeHex);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (type === 'r') {
    // Textura estilo tijolos de pedra Minecraft para a Torre
    ctx.fillStyle = mainCss;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = darkCss;
    for (let y = 0; y < 64; y += 8) {
      ctx.fillRect(0, y, 64, 1);
      const offset = (y / 8) % 2 === 0 ? 0 : 8;
      for (let x = offset; x < 64; x += 16) {
        ctx.fillRect(x, y, 1, 8);
      }
    }
    ctx.fillStyle = accentCss;
    ctx.fillRect(4, 4, 12, 4);
    ctx.fillRect(36, 20, 12, 4);
    ctx.fillRect(18, 44, 14, 4);
  } else if (type === 'n') {
    // Textura estilo pelagem de Cavalo Minecraft com manchas e crina
    ctx.fillStyle = mainCss;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = lightCss;
    ctx.fillRect(6, 6, 18, 12);
    ctx.fillRect(34, 24, 20, 16);
    ctx.fillStyle = darkCss;
    ctx.fillRect(10, 38, 16, 14);
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 52, 64, 12); // faixa da sela/rédea
  } else {
    // Skin 64x64 para Rei, Rainha, Bispo e Peão
    ctx.fillStyle = mainCss;
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = darkCss;
    ctx.fillRect(28, 20, 12, 12);
    ctx.fillRect(0, 20, 16, 12);
    ctx.fillRect(16, 52, 16, 12);

    ctx.fillStyle = accentCss;
    ctx.fillRect(16, 20, 24, 10);
    ctx.fillRect(40, 16, 16, 7);
    ctx.fillRect(32, 48, 16, 7);
    ctx.fillRect(0, 27, 16, 5);
    ctx.fillRect(16, 59, 16, 5);

    ctx.fillStyle = accentLightCss;
    ctx.fillRect(20, 27, 8, 2);
    ctx.fillRect(23, 21, 2, 5);

    ctx.fillStyle = mainCss;
    ctx.fillRect(8, 8, 8, 8);

    if (type === 'k') {
      ctx.fillStyle = accentCss;
      ctx.fillRect(0, 8, 32, 3);
      ctx.fillStyle = darkCss;
      ctx.fillRect(9, 14, 6, 2); // barba real
    } else if (type === 'q') {
      ctx.fillStyle = accentCss;
      ctx.fillRect(0, 8, 32, 2);
      ctx.fillRect(20, 22, 8, 8); // corpete real
    } else if (type === 'b') {
      ctx.fillStyle = accentCss;
      ctx.fillRect(8, 0, 8, 8);
      ctx.fillRect(22, 20, 4, 12); // estola
    } else {
      ctx.fillStyle = accentCss;
      ctx.fillRect(0, 8, 32, 2);
    }

    ctx.fillStyle = eyeCss;
    ctx.fillRect(9, 12, 2, 2);
    ctx.fillRect(13, 12, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  SKIN_TEX_CACHE.set(cacheKey, texture);
  return texture;
}

function patchThree170Compat(root) {
  root.traverse((child) => {
    if (typeof child.onBeforeShadow !== 'function') child.onBeforeShadow = () => {};
    if (typeof child.onAfterShadow !== 'function') child.onAfterShadow = () => {};
    if (typeof child.onBeforeRender !== 'function') child.onBeforeRender = () => {};
    if (typeof child.onAfterRender !== 'function') child.onAfterRender = () => {};
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function buildMinecraftHorse(color, palette, mainMat, accentMat, eyeMat) {
  const tex = createProceduralSkinTexture('n', color, palette);
  const horseMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 });

  const body = new THREE.Group();
  body.position.y = 0.12;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.58), horseMat);
  torso.position.set(0, 0.34, 0);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.28), accentMat);
  saddle.position.set(0, 0.49, 0.02);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.08), accentMat);
  tail.position.set(0, 0.3, -0.32);
  tail.rotation.x = -0.35;
  body.add(torso, saddle, tail);

  // 4 patas articuladas estilo Minecraft
  const legGeo = new THREE.BoxGeometry(0.1, 0.28, 0.1);
  const makeLeg = (x, z) => {
    const g = new THREE.Group();
    g.position.set(x, 0.24, z);
    const m = new THREE.Mesh(legGeo, horseMat);
    m.position.y = -0.1;
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.11), accentMat);
    hoof.position.y = -0.21;
    g.add(m, hoof);
    body.add(g);
    return g;
  };
  const legFL = makeLeg(-0.11, 0.2);
  const legFR = makeLeg(0.11, 0.2);
  const legBL = makeLeg(-0.11, -0.2);
  const legBR = makeLeg(0.11, -0.2);

  // Pescoço, cabeça, focinho, orelhas, crina e rédeas
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0.22);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.2), horseMat);
  neck.rotation.x = 0.3;
  const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.24), horseMat);
  cranium.position.set(0, 0.2, 0.08);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.18), horseMat);
  muzzle.position.set(0, 0.16, 0.24);
  const bridle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.14), accentMat);
  bridle.position.set(0, 0.17, 0.22);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.09), accentMat);
  mane.position.set(0, 0.08, -0.09);
  mane.rotation.x = 0.3;
  const earGeo = new THREE.BoxGeometry(0.05, 0.1, 0.05);
  const earL = new THREE.Mesh(earGeo, horseMat);
  earL.position.set(-0.06, 0.32, 0.04);
  const earR = earL.clone();
  earR.position.x = 0.06;
  const eyeGeo = new THREE.BoxGeometry(0.03, 0.04, 0.04);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.09, 0.22, 0.14);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  head.add(neck, cranium, muzzle, bridle, mane, earL, earR, eyeL, eyeR);
  body.add(head);

  return {
    body,
    parts: {
      body,
      head,
      tail,
      legFL,
      legFR,
      legBL,
      legBR,
      rightArm: legFR,
      leftArm: legFL,
    },
  };
}

function buildMinecraftRook(color, palette, accentMat, eyeMat) {
  const tex = createProceduralSkinTexture('r', color, palette);
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.15 });

  const body = new THREE.Group();
  body.position.y = 0.12;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.48), stoneMat);
  torso.position.y = 0.31;
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = 0.64;
  const merlonGeo = new THREE.BoxGeometry(0.13, 0.14, 0.13);
  for (const [ox, oz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
    const m = new THREE.Mesh(merlonGeo, accentMat);
    m.position.set(ox, 0.05, oz);
    head.add(m);
  }
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.06), accentMat);
  visor.position.set(0, -0.14, 0.24);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.04), eyeMat);
  eyeL.position.set(-0.09, -0.14, 0.26);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  head.add(visor, eyeL, eyeR);
  body.add(head);

  const armGeo = new THREE.BoxGeometry(0.13, 0.4, 0.13);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 0.42, 0);
  const rMesh = new THREE.Mesh(armGeo, stoneMat);
  rMesh.position.y = -0.14;
  const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), accentMat);
  rFist.position.y = -0.32;
  rightArm.add(rMesh, rFist);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 0.42, 0);
  const lMesh = rMesh.clone();
  const lFist = rFist.clone();
  leftArm.add(lMesh, lFist);

  body.add(rightArm, leftArm);
  return {
    body,
    parts: { body, head, rightArm, leftArm },
  };
}

/**
 * Constrói peças animadas com formato, skin e adereços próprios por tipo.
 */
export function buildSkinviewPiece(type, color, palette, materials) {
  const root = new THREE.Group();
  const mainMat = materials[color];
  const accentMat = getAccentMaterial(type, color, materials);
  const eyeMat = color === 'w' ? materials.eyeW : materials.eyeB;

  const base = new THREE.Mesh(BASE_GEO, mainMat);
  base.position.y = 0.06;
  root.add(base);

  const baseRim = new THREE.Mesh(RIM_GEO, accentMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = 0.025;
  root.add(baseRim);

  if (type === 'n') {
    const horse = buildMinecraftHorse(color, palette, mainMat, accentMat, eyeMat);
    root.add(horse.body);
    root.rotation.y = color === 'w' ? Math.PI : 0;
    patchThree170Compat(root);
    root.userData = {
      type,
      color,
      state: 'idle',
      phase: Math.random() * Math.PI * 2,
      isSkinview: false,
      isMinecraftHorse: true,
      parts: horse.parts,
    };
    return root;
  }

  if (type === 'r') {
    const rook = buildMinecraftRook(color, palette, accentMat, eyeMat);
    root.add(rook.body);
    root.rotation.y = color === 'w' ? Math.PI : 0;
    patchThree170Compat(root);
    root.userData = {
      type,
      color,
      state: 'idle',
      phase: Math.random() * Math.PI * 2,
      isSkinview: false,
      isMinecraftRook: true,
      parts: rook.parts,
    };
    return root;
  }

  // Rei, Rainha, Bispo e Peão usam PlayerObject (skinview3d) + adereços 3D exclusivos
  const player = new PlayerObject();
  const tex = createProceduralSkinTexture(type, color, palette);
  player.skin.layer1Material.map = tex;
  player.skin.layer1Material.needsUpdate = true;
  player.skin.layer2Material.map = tex;
  player.skin.layer2Material.needsUpdate = true;

  // Adereços 3D na escala interna do skinview3d (1 bloco ~ 8 unidades)
  if (type === 'k') {
    const crownBand = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.2, 9.2), accentMat);
    crownBand.position.set(0, 8.6, 0);
    player.skin.head.add(crownBand);
    for (const [sx, sz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) {
      const spike = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 1.8), accentMat);
      spike.position.set(sx, 10.6, sz);
      player.skin.head.add(spike);
    }
    const cape = new THREE.Mesh(new THREE.BoxGeometry(9, 13, 1.2), accentMat);
    cape.position.set(0, -1, -3);
    player.skin.body.add(cape);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(1.4, 14, 2.2), accentMat);
    sword.position.set(0, -8, 6);
    sword.rotation.x = Math.PI / 3;
    player.skin.rightArm.add(sword);
  } else if (type === 'q') {
    const tiara = new THREE.Mesh(new THREE.BoxGeometry(9, 1.8, 9), accentMat);
    tiara.position.set(0, 8.5, 0);
    const gem = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 2.4), eyeMat);
    gem.position.set(0, 10.2, 4.2);
    player.skin.head.add(tiara, gem);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(8.5, 12, 1), accentMat);
    cape.position.set(0, -1, -2.8);
    player.skin.body.add(cape);
    const scepter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 13, 1.2), accentMat);
    scepter.position.set(0, -7, 5);
    scepter.rotation.x = Math.PI / 3;
    const orb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), eyeMat);
    orb.position.set(0, -2, 10);
    player.skin.rightArm.add(scepter, orb);
  } else if (type === 'b') {
    const mitre = new THREE.Mesh(new THREE.ConeGeometry(5.4, 8, 4), accentMat);
    mitre.rotation.y = Math.PI / 4;
    mitre.position.set(0, 11.5, 0);
    player.skin.head.add(mitre);
    const staff = new THREE.Mesh(new THREE.BoxGeometry(1.1, 18, 1.1), accentMat);
    staff.position.set(0, -4, 4.5);
    staff.rotation.x = Math.PI / 5;
    const orb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), eyeMat);
    orb.position.set(0, 4.5, 7.5);
    player.skin.rightArm.add(staff, orb);
  } else {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7, 6), accentMat);
    shield.position.set(-2.5, -5, 3);
    player.skin.leftArm.add(shield);
    const spear = new THREE.Mesh(new THREE.BoxGeometry(1.1, 15, 1.1), accentMat);
    spear.position.set(0, -6, 5);
    spear.rotation.x = Math.PI / 3;
    player.skin.rightArm.add(spear);
  }

  const scaleFactor = type === 'k' ? 0.036 : type === 'q' ? 0.034 : type === 'p' ? 0.027 : 0.031;
  player.scale.setScalar(scaleFactor);
  player.position.y = 0.54 * (scaleFactor / 0.031);
  root.add(player);

  // Face das peças brancas olha para -Z e pretas para +Z
  root.rotation.y = color === 'w' ? Math.PI : 0;
  patchThree170Compat(root);

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
