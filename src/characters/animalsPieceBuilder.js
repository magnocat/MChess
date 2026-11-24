import * as THREE from 'three';
import { createPieceLabelSprite } from './pieceBuilder.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smooth = (t) => t * t * (3 - 2 * t);

const CUBE_GEO = new THREE.BoxGeometry(1, 1, 1);
const RIM_GEO = new THREE.TorusGeometry(0.39, 0.022, 8, 24);
const GLINT_MAT = new THREE.MeshStandardMaterial({ color: '#eee8ce', roughness: 0.5 });
const UNIT_Y = new THREE.Vector3(0, 1, 0);
const DIR_VEC = new THREE.Vector3();
const MID_VEC = new THREE.Vector3();
const HIP_VEC = new THREE.Vector3();

function hash(x, z, s = 0) {
  let n =
    Math.imul(x | 0, 374761393) ^
    Math.imul(z | 0, 668265263) ^
    Math.imul(s + 7241, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const PIXEL_MAT_CACHE = new Map();

function pixelMaterial(baseHex, seed, patches = false) {
  const key = `${baseHex}_${seed}_${patches ? 1 : 0}`;
  if (PIXEL_MAT_CACHE.has(key)) return PIXEL_MAT_CACHE.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const baseColor = new THREE.Color(baseHex);
  const tmp = new THREE.Color();

  if (ctx) {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        tmp.copy(baseColor).multiplyScalar(0.9 + hash(x, y, seed) * 0.19);
        if (
          patches &&
          ((x > 5 && x < 15 && y > 5 && y < 24) ||
            (x > 20 && y > 18) ||
            (x > 9 && x < 19 && y > 12 && y < 20))
        ) {
          tmp.set('#dfd5b8').multiplyScalar(0.94 + hash(x, y, seed + 1) * 0.1);
        }
        ctx.fillStyle = `#${tmp.getHexString()}`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.91 });
  PIXEL_MAT_CACHE.set(key, mat);
  return mat;
}

function box(parent, material, size, position, rotation = null) {
  const mesh = new THREE.Mesh(CUBE_GEO, material);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function placeSegment(mesh, a, b, width, depth) {
  DIR_VEC.subVectors(b, a);
  const length = Math.max(0.001, DIR_VEC.length());
  MID_VEC.addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(MID_VEC);
  mesh.quaternion.setFromUnitVectors(UNIT_Y, DIR_VEC.normalize());
  mesh.scale.set(width, length, depth);
}

function faceEyes(parent, width, y, z, eyeMat, glintMat, size = 0.065) {
  for (const sign of [-1, 1]) {
    box(parent, glintMat, [0.018, size * 1.35, size * 1.35], [sign * (width / 2 + 0.006), y, z]);
    box(parent, eyeMat, [0.022, size, size * 0.68], [sign * (width / 2 + 0.013), y, z + 0.012]);
  }
}

function buildWildHorse(color, accentMat, eyeMat, glintMat) {
  const isW = color === 'w';
  const coat = pixelMaterial(isW ? '#d8c8ae' : '#5e3826', isW ? 41 : 141);
  const pinto = pixelMaterial(isW ? '#e6decb' : '#42261a', isW ? 42 : 142, true);
  const darkCoat = pixelMaterial(isW ? '#b5a284' : '#3a2218', isW ? 43 : 143);
  const sock = pixelMaterial(isW ? '#ffffff' : '#9c8b75', isW ? 44 : 144);
  const muzzleMat = pixelMaterial(isW ? '#e5d4be' : '#7a5741', isW ? 45 : 145);
  const maneMat = pixelMaterial(isW ? '#8f7d65' : '#1f1917', isW ? 46 : 146);
  const hoofMat = pixelMaterial('#48443d', 47);

  const rigRoot = new THREE.Group();
  rigRoot.scale.setScalar(0.36);

  const body = new THREE.Group();
  rigRoot.add(body);
  box(body, pinto, [0.73, 0.77, 1.5], [0, 0, 0]);
  box(body, coat, [0.78, 0.67, 0.43], [0, 0.005, 0.54]);
  box(body, pinto, [0.8, 0.72, 0.47], [0, 0.015, -0.55]);
  box(body, darkCoat, [0.56, 0.11, 1.28], [0, 0.36, -0.03]);
  box(body, accentMat, [0.76, 0.09, 0.45], [0, 0.39, 0.0]); // sela colorida do time

  const neck = new THREE.Group();
  neck.position.set(0, 0.23, 0.62);
  neck.rotation.x = 0.43;
  body.add(neck);
  box(neck, coat, [0.47, 0.92, 0.45], [0, 0.35, 0]);
  for (let i = 0; i < 6; i += 1) {
    box(neck, maneMat, [0.16, 0.18, 0.13], [0, 0.04 + i * 0.14, -0.255]);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.83, 0.055);
  head.rotation.x = -0.28;
  neck.add(head);
  box(head, coat, [0.46, 0.48, 0.63], [0, 0, 0.05]);
  box(head, muzzleMat, [0.47, 0.31, 0.36], [0, -0.16, 0.4]);
  for (const side of [-1, 1]) {
    box(head, eyeMat, [0.026, 0.097, 0.105], [side * 0.238, 0.066, 0.087]);
    box(head, glintMat, [0.029, 0.031, 0.026], [side * 0.24, 0.087, 0.112]);
  }
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.17, 0.23, -0.12);
    ear.rotation.z = -side * 0.12;
    box(ear, coat, [0.12, 0.25, 0.14], [0, 0.12, 0]);
    head.add(ear);
    ears.push(ear);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.19, -0.81);
  body.add(tail);
  const tailLinks = [];
  let pTail = tail;
  for (let i = 0; i < 3; i += 1) {
    const link = new THREE.Group();
    if (i) link.position.y = -0.26;
    pTail.add(link);
    box(link, maneMat, [0.18 + i * 0.02, 0.32, 0.18], [0, -0.14, 0]);
    tailLinks.push(link);
    pTail = link;
  }

  const legs = [];
  for (const cfg of [
    { side: -1, front: false, offset: 0 },
    { side: 1, front: false, offset: 0.12 },
    { side: -1, front: true, offset: 0.43 },
    { side: 1, front: true, offset: 0.55 },
  ]) {
    const g = new THREE.Group();
    rigRoot.add(g);
    legs.push({
      ...cfg,
      upper: box(g, coat, [0.235, 1, 0.25], [0, 0, 0]),
      lower: box(g, cfg.side === 1 ? sock : coat, [0.14, 1, 0.16], [0, 0, 0]),
      joint: box(g, coat, [0.19, 0.19, 0.19], [0, 0, 0]),
      hoof: box(g, hoofMat, [0.19, 0.19, 0.25], [0, 0, 0]),
      hip: new THREE.Vector3(),
      knee: new THREE.Vector3(),
      foot: new THREE.Vector3(),
    });
  }

  let gaitPhase = 0.17;
  let hasIdlePose = false;
  const animate = (dt, speed, elapsed) => {
    const isMoving = speed > 0.15;
    if (!isMoving && hasIdlePose) {
      ears.forEach((ear, i) => {
        ear.rotation.x = 0.05 * Math.sin(elapsed * 0.9 + i * 2);
      });
      tail.rotation.x = 0.75 + 0.06 * Math.sin(elapsed * 1.4);
      return;
    }

    const stride = 4.8 + speed * 0.07;
    gaitPhase = (gaitPhase + (dt * speed) / stride) % 1;
    const wave = TAU * gaitPhase;
    body.position.y = 1.46 + (isMoving ? 0.06 * Math.cos(wave + 0.55) : 0);
    body.rotation.x = speed > 0.2 ? 0.055 * Math.sin(wave - 0.5) : 0;
    body.updateMatrix();
    neck.rotation.x = 0.43 - (isMoving ? 0.025 * Math.sin(wave - 0.65) : 0);
    head.rotation.x = -0.28 + (isMoving ? 0.025 * Math.sin(wave - 1) : 0);
    ears.forEach((ear, i) => {
      ear.rotation.x = 0.05 * Math.sin(elapsed * 0.9 + i * 2);
    });
    tail.rotation.x = 0.75 + 0.14 * Math.sin(wave - 1.2);
    tailLinks.forEach((link, i) => {
      link.rotation.z = 0.07 * Math.sin(elapsed * 2 - i * 0.6);
    });

    for (const leg of legs) {
      const p = (gaitPhase - leg.offset + 1) % 1;
      const stance = 0.205;
      const reach = 0.57;
      const back = reach - stride * stance;
      const down = p < stance;
      let z;
      let y;
      if (!isMoving) {
        z = 0;
        y = 0.1;
      } else if (down) {
        z = reach - p * stride;
        y = 0.1;
      } else {
        const t = (p - stance) / (1 - stance);
        z = lerp(back, reach, smooth(t));
        y = 0.1 + Math.sin(Math.PI * t) * (0.58 + (leg.front ? 0.12 : 0));
      }

      HIP_VEC.set(leg.side * 0.285, -0.255, leg.front ? 0.52 : -0.55).applyMatrix4(body.matrix);
      leg.hip.copy(HIP_VEC);
      leg.foot.set(leg.side * 0.285, y, (leg.front ? 0.52 : -0.55) + z);

      const dy = leg.foot.y - leg.hip.y;
      const dz = leg.foot.z - leg.hip.z;
      const a = 0.61;
      const b = 0.67;
      const raw = Math.max(0.001, Math.hypot(dy, dz));
      const d = clamp(raw, 0.08, a + b - 0.001);
      const uy = dy / raw;
      const uz = dz / raw;
      const along = (a * a - b * b + d * d) / (2 * d);
      const bend = Math.sqrt(Math.max(0, a * a - along * along));
      const sign = leg.front ? -1 : 1;

      leg.knee.set(
        leg.hip.x,
        leg.hip.y + uy * along - uz * bend * sign,
        leg.hip.z + uz * along + uy * bend * sign,
      );
      if (raw > d) leg.foot.set(leg.foot.x, leg.hip.y + uy * d, leg.hip.z + uz * d);

      placeSegment(leg.upper, leg.hip, leg.knee, leg.front ? 0.215 : 0.27, leg.front ? 0.22 : 0.3);
      placeSegment(leg.lower, leg.knee, leg.foot, 0.135, 0.15);
      leg.joint.position.copy(leg.knee);
      leg.hoof.position.copy(leg.foot);
    }

    hasIdlePose = !isMoving;
  };

  animate(0, 0, 0);
  return {
    rigRoot,
    animate,
    parts: { body, head, rightArm: neck, leftArm: tail },
  };
}

function buildWildQuadruped(animalKind, color, accentMat, eyeMat, glintMat) {
  const isW = color === 'w';
  const configs = {
    lion: {
      width: 0.78, height: 0.68, length: 1.35, y: 1.05, upper: 0.4, lower: 0.42,
      hipDrop: 0.26, foot: 0.08, stride: 3.4, stance: 0.2, lift: 0.32, bob: 0.035,
      legWidth: 0.16, skinHex: isW ? '#e5c17b' : '#734b20', legHex: isW ? '#d4ab5f' : '#573615',
      offsets: [0, 0.12, 0.45, 0.57], scale: 0.42,
    },
    sheep: {
      width: 0.73, height: 0.63, length: 1.12, y: 0.89, upper: 0.33, lower: 0.35,
      hipDrop: 0.23, foot: 0.075, stride: 2.9, stance: 0.2, lift: 0.29, bob: 0.045,
      legWidth: 0.14, skinHex: isW ? '#ded9c5' : '#333642', legHex: isW ? '#68675b' : '#22242d',
      offsets: [0, 0.08, 0.46, 0.54], scale: 0.42,
    },
    cow: {
      width: 0.81, height: 0.73, length: 1.43, y: 1.1, upper: 0.43, lower: 0.45,
      hipDrop: 0.27, foot: 0.085, stride: 3.6, stance: 0.205, lift: 0.37, bob: 0.04,
      legWidth: 0.17, skinHex: isW ? '#e6ddc6' : '#303430', legHex: isW ? '#d4cbb5' : '#242724',
      offsets: [0, 0.12, 0.45, 0.57], scale: 0.38,
    },
    pig: {
      width: 0.64, height: 0.54, length: 1.04, y: 0.73, upper: 0.27, lower: 0.29,
      hipDrop: 0.22, foot: 0.07, stride: 2.4, stance: 0.2, lift: 0.2, bob: 0.025,
      legWidth: 0.16, skinHex: isW ? '#f0b6b4' : '#7a4547', legHex: isW ? '#da9290' : '#592e30',
      offsets: [0, 0.5, 0.5, 0], scale: 0.44,
    },
  };

  const config = configs[animalKind];
  const skinMat = pixelMaterial(config.skinHex, animalKind.length * 17 + (isW ? 1 : 9), animalKind === 'cow');
  const legMat = pixelMaterial(config.legHex, animalKind.length * 23 + (isW ? 2 : 8));
  const hoofMat = pixelMaterial('#48443d', 47);

  const rigRoot = new THREE.Group();
  rigRoot.scale.setScalar(config.scale);
  const torso = new THREE.Group();
  rigRoot.add(torso);

  box(torso, skinMat, [config.width, config.height, config.length], [0, 0, 0]);
  const face = new THREE.Group();
  torso.add(face);
  const tailPivot = new THREE.Group();
  torso.add(tailPivot);

  if (animalKind === 'lion') {
    // Rei Leão: juba + coroa + capa
    face.position.set(0, 0.1, 0.85);
    box(face, accentMat, [0.76, 0.76, 0.32], [0, 0, -0.08]); // juba
    box(face, skinMat, [0.5, 0.5, 0.48], [0, 0, 0.12]);
    box(face, accentMat, [0.42, 0.12, 0.42], [0, 0.34, 0.12]); // coroa
    faceEyes(face, 0.5, 0.08, 0.2, eyeMat, glintMat, 0.07);
    box(torso, accentMat, [0.7, 0.08, 1.05], [0, 0.37, -0.1]); // capa real
    tailPivot.position.set(0, 0.15, -0.72);
    box(tailPivot, skinMat, [0.08, 0.5, 0.08], [0, -0.2, -0.05]);
  } else if (animalKind === 'sheep') {
    // Rainha Ovelha: lã em camadas + tiara + capa
    box(torso, skinMat, [0.78, 0.43, 0.93], [0, -0.035, 0]);
    box(torso, accentMat, [0.68, 0.08, 0.85], [0, 0.36, -0.05]); // capa real
    face.position.set(0, 0.05, 0.72);
    box(face, legMat, [0.37, 0.43, 0.43], [0, 0, 0]);
    box(face, accentMat, [0.38, 0.12, 0.36], [0, 0.26, 0]); // tiara
    faceEyes(face, 0.37, 0.07, 0.075, eyeMat, glintMat, 0.068);
    tailPivot.position.set(0, 0.05, -0.58);
    box(tailPivot, skinMat, [0.19, 0.27, 0.2], [0, -0.06, -0.04]);
  } else if (animalKind === 'cow') {
    // Torre Touro/Vaca: chifres + ameias nas costas
    face.position.set(0, 0.06, 0.89);
    box(face, skinMat, [0.49, 0.55, 0.48], [0, 0, 0]);
    faceEyes(face, 0.49, 0.06, 0.11, eyeMat, glintMat, 0.075);
    for (const sign of [-1, 1]) {
      box(face, accentMat, [0.1, 0.24, 0.11], [sign * 0.2, 0.34, -0.08], [0, 0, -sign * 0.2]);
    }
    box(torso, accentMat, [0.78, 0.12, 0.35], [0, 0.4, 0]);
    tailPivot.position.set(0, 0.2, -0.76);
    box(tailPivot, skinMat, [0.075, 0.5, 0.075], [0, -0.22, -0.04]);
  } else {
    // Bispo Porco: focinho + mitra clerical + capa
    face.position.set(0, 0.015, 0.66);
    box(face, skinMat, [0.53, 0.45, 0.48], [0, 0, 0]);
    box(face, legMat, [0.33, 0.21, 0.18], [0, -0.07, 0.3]);
    box(face, accentMat, [0.28, 0.28, 0.28], [0, 0.32, 0]); // mitra
    box(torso, accentMat, [0.58, 0.07, 0.8], [0, 0.3, -0.05]); // capa clerical
    faceEyes(face, 0.53, 0.065, 0.065, eyeMat, glintMat, 0.065);
    tailPivot.position.set(0, 0.08, -0.55);
    box(tailPivot, skinMat, [0.08, 0.14, 0.14], [0, 0, -0.08]);
  }

  const rigLegs = [];
  for (let i = 0; i < 4; i += 1) {
    const side = i % 2 ? 1 : -1;
    const front = i >= 2;
    const g = new THREE.Group();
    rigRoot.add(g);
    rigLegs.push({
      side,
      front,
      offset: config.offsets[i],
      upper: box(g, legMat, [config.legWidth, 1, config.legWidth], [0, 0, 0]),
      lower: box(g, legMat, [config.legWidth * 0.85, 1, config.legWidth * 0.85], [0, 0, 0]),
      hoof: box(g, hoofMat, [config.legWidth * 1.08, config.foot * 2, config.legWidth * 1.25], [0, 0, 0]),
      hip: new THREE.Vector3(),
      knee: new THREE.Vector3(),
      foot: new THREE.Vector3(),
    });
  }

  let phase = 0.25;
  let hasIdlePose = false;
  const animate = (dt, speed, elapsed) => {
    const isMoving = speed > 0.15;
    if (!isMoving && hasIdlePose) {
      face.rotation.x = 0.03 * Math.sin(elapsed * 1.1);
      tailPivot.rotation.z = 0.1 * Math.sin(elapsed * 2.2);
      return;
    }

    phase = (phase + (dt * speed) / config.stride) % 1;
    const wave = phase * TAU;
    torso.position.y = config.y + (isMoving ? config.bob * Math.cos(wave) : 0);
    torso.rotation.x = isMoving ? 0.035 * Math.sin(wave) : 0;
    torso.updateMatrix();
    face.rotation.x = 0.03 * Math.sin(elapsed * 1.1);
    tailPivot.rotation.z = 0.1 * Math.sin(elapsed * 2.2);

    for (const leg of rigLegs) {
      const p = (phase - leg.offset + 1) % 1;
      const down = p < config.stance;
      const reach = (config.stride * config.stance) / 2;
      let z;
      let y = config.foot;
      if (!isMoving) {
        z = 0;
      } else if (down) {
        z = reach - p * config.stride;
      } else {
        const t = (p - config.stance) / (1 - config.stance);
        z = lerp(-reach, reach, smooth(t));
        y += Math.sin(Math.PI * t) * config.lift;
      }
      const hipZ = (leg.front ? 1 : -1) * config.length * 0.33;
      leg.hip.set(leg.side * config.width * 0.34, -config.hipDrop, hipZ).applyMatrix4(torso.matrix);
      leg.foot.set(leg.side * config.width * 0.34, y, hipZ + z);

      const dy = y - leg.hip.y;
      const dz = leg.foot.z - leg.hip.z;
      const raw = Math.max(0.001, Math.hypot(dy, dz));
      const d = clamp(raw, 0.03, config.upper + config.lower - 0.001);
      const uy = dy / raw;
      const uz = dz / raw;
      const a = (config.upper ** 2 - config.lower ** 2 + d * d) / (2 * d);
      const bend = Math.sqrt(Math.max(0, config.upper ** 2 - a * a));
      const sign = leg.front ? -1 : 1;

      leg.knee.set(
        leg.hip.x,
        leg.hip.y + uy * a - uz * bend * sign,
        leg.hip.z + uz * a + uy * bend * sign,
      );
      if (raw > d) leg.foot.set(leg.foot.x, leg.hip.y + uy * d, leg.hip.z + uz * d);

      placeSegment(leg.upper, leg.hip, leg.knee, config.legWidth, config.legWidth);
      placeSegment(leg.lower, leg.knee, leg.foot, config.legWidth * 0.8, config.legWidth * 0.85);
      leg.hoof.position.copy(leg.foot);
    }

    hasIdlePose = !isMoving;
  };

  animate(0, 0, 0);
  return {
    rigRoot,
    animate,
    parts: { body: torso, head: face, rightArm: face, leftArm: tailPivot },
  };
}

function buildWildChicken(color, accentMat, eyeMat, glintMat) {
  const isW = color === 'w';
  const birdMat = pixelMaterial(isW ? '#ece6ce' : '#3b3e4a', isW ? 88 : 188);
  const wingTipMat = pixelMaterial(isW ? '#cac8b8' : '#252730', isW ? 86 : 186);
  const beakMat = pixelMaterial('#d9a044', 89);

  const rigRoot = new THREE.Group();
  rigRoot.scale.setScalar(0.75);
  const torso = new THREE.Group();
  rigRoot.add(torso);

  box(torso, birdMat, [0.38, 0.42, 0.51], [0, 0, 0]);
  box(torso, birdMat, [0.22, 0.31, 0.23], [0, 0.24, 0.16]);

  const face = new THREE.Group();
  face.position.set(0, 0.4, 0.23);
  torso.add(face);
  box(face, birdMat, [0.3, 0.3, 0.3], [0, 0, 0]);
  faceEyes(face, 0.3, 0.035, 0.04, eyeMat, glintMat, 0.045);
  box(face, beakMat, [0.17, 0.1, 0.19], [0, -0.025, 0.22]);
  box(face, accentMat, [0.1, 0.14, 0.1], [0, -0.14, 0.15]); // barbela com cor do time
  for (let i = 0; i < 3; i += 1) {
    box(face, accentMat, [0.075, 0.11 + (i % 2) * 0.04, 0.075], [0, 0.19, (i - 1) * 0.075]);
  }

  const wings = [];
  for (const sign of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(sign * 0.18, 0.04, -0.015);
    torso.add(wing);
    box(wing, birdMat, [0.11, 0.29, 0.43], [sign * 0.06, -0.09, 0]);
    box(wing, wingTipMat, [0.12, 0.1, 0.39], [sign * 0.065, -0.23, -0.02]);
    wings.push(wing);
  }

  const birdLegs = [];
  for (const sign of [-1, 1]) {
    const pivot = new THREE.Group();
    rigRoot.add(pivot);
    box(pivot, beakMat, [0.045, 0.32, 0.045], [0, -0.16, 0]);
    for (let i = 0; i < 3; i += 1) {
      box(pivot, beakMat, [0.026, 0.035, 0.17], [0.035 * (i - 1), -0.32, 0.055]);
    }
    birdLegs.push({ pivot, sign });
  }

  let phase = 0.2;
  const animate = (dt, speed, elapsed) => {
    phase = (phase + (dt * speed) / 1.65) % 1;
    const isMoving = speed > 0.15;
    const flapSpeed = isMoving ? 24 : 2.5;
    const flapAmp = isMoving ? 0.85 : 0.08;
    torso.position.y = 0.55 + (isMoving ? 0.15 : 0) + 0.02 * Math.sin(elapsed * 2.2);
    face.rotation.x = 0.05 * Math.sin(elapsed * 1.4);
    wings.forEach((wing, i) => {
      const sign = i ? 1 : -1;
      wing.rotation.z = sign * (0.12 + Math.abs(Math.sin(elapsed * flapSpeed)) * flapAmp);
    });
    for (const leg of birdLegs) {
      const p = (phase + (leg.sign > 0 ? 0.5 : 0)) % 1;
      leg.pivot.position.set(leg.sign * 0.1, 0.38 + (isMoving ? 0.12 : 0), 0);
      leg.pivot.rotation.x = isMoving ? 0.65 * Math.sin(p * TAU) : 0;
    }
  };

  animate(0, 0, 0);
  return {
    rigRoot,
    animate,
    parts: { body: torso, head: face, rightArm: wings[1], leftArm: wings[0] },
  };
}

/**
 * Constrói uma peça animal IK inspirada no projeto Wild Run 3D.
 */
export function buildAnimalPiece(type, color, materials) {
  const root = new THREE.Group();
  const eyeMat = color === 'w' ? materials.eyeW : materials.eyeB;

  const accentMap = {
    k: color === 'w' ? materials.kingW : materials.kingB,
    q: color === 'w' ? materials.queenW : materials.queenB,
    b: color === 'w' ? materials.bishopW : materials.bishopB,
    n: color === 'w' ? materials.knightW : materials.knightB,
    r: color === 'w' ? materials.rookW : materials.rookB,
    p: color === 'w' ? materials.wAccent : materials.bAccent,
  };
  const accentMat = accentMap[type] || materials.wAccent;

  const baseRim = new THREE.Mesh(RIM_GEO, accentMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = 0.02;
  root.add(baseRim);

  let built;
  if (type === 'n') {
    built = buildWildHorse(color, accentMat, eyeMat, GLINT_MAT);
  } else if (type === 'k') {
    built = buildWildQuadruped('lion', color, accentMat, eyeMat, GLINT_MAT);
  } else if (type === 'q') {
    built = buildWildQuadruped('sheep', color, accentMat, eyeMat, GLINT_MAT);
  } else if (type === 'r') {
    built = buildWildQuadruped('cow', color, accentMat, eyeMat, GLINT_MAT);
  } else if (type === 'b') {
    built = buildWildQuadruped('pig', color, accentMat, eyeMat, GLINT_MAT);
  } else {
    built = buildWildChicken(color, accentMat, eyeMat, GLINT_MAT);
  }

  root.add(built.rigRoot);
  root.rotation.y = color === 'w' ? Math.PI : 0;

  const labelSprite = createPieceLabelSprite(type, color);
  root.add(labelSprite);

  root.userData = {
    type,
    color,
    state: 'idle',
    phase: Math.random() * Math.PI * 2,
    labelSprite,
    isAnimal: true,
    animateAnimal: built.animate,
    parts: built.parts,
  };

  return root;
}
