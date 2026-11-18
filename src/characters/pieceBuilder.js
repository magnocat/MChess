import * as THREE from 'three';

/**
 * Construtor procedural de personagens 3D vivos (estilo Wizard's Chess).
 * Usa geometrias compartilhadas para manter alto FPS em celulares e PCs simples.
 */

const SHARED_GEO = {
  base: new THREE.CylinderGeometry(0.36, 0.4, 0.14, 16),
  torso: new THREE.CylinderGeometry(0.18, 0.24, 0.45, 12),
  head: new THREE.SphereGeometry(0.15, 14, 12),
  arm: new THREE.BoxGeometry(0.09, 0.34, 0.09),
  sword: new THREE.BoxGeometry(0.04, 0.42, 0.07),
  shield: new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12),
  towerBody: new THREE.BoxGeometry(0.46, 0.62, 0.46),
  battlement: new THREE.BoxGeometry(0.12, 0.14, 0.12),
  horseBody: new THREE.BoxGeometry(0.32, 0.28, 0.54),
  horseNeck: new THREE.BoxGeometry(0.18, 0.36, 0.2),
  horseHead: new THREE.BoxGeometry(0.16, 0.16, 0.32),
  horseLeg: new THREE.BoxGeometry(0.08, 0.26, 0.08),
  ear: new THREE.ConeGeometry(0.04, 0.1, 6),
  crownRing: new THREE.TorusGeometry(0.14, 0.03, 8, 16),
  crownSpike: new THREE.ConeGeometry(0.04, 0.12, 6),
  mitre: new THREE.ConeGeometry(0.15, 0.28, 10),
  staff: new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8),
  orb: new THREE.SphereGeometry(0.07, 10, 10),
  cape: new THREE.BoxGeometry(0.36, 0.48, 0.05),
};

export function createPieceMaterials() {
  return {
    w: new THREE.MeshStandardMaterial({
      color: 0xf0ead6,
      roughness: 0.35,
      metalness: 0.15,
    }),
    wAccent: new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.7,
    }),
    b: new THREE.MeshStandardMaterial({
      color: 0x262936,
      roughness: 0.4,
      metalness: 0.25,
    }),
    bAccent: new THREE.MeshStandardMaterial({
      color: 0x9b2c2c,
      roughness: 0.35,
      metalness: 0.5,
    }),
    // Cores distintas para Rei, Rainha e peças chave
    kingW: new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.85 }),
    kingB: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.8 }),
    queenW: new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.28, metalness: 0.6 }),
    queenB: new THREE.MeshStandardMaterial({ color: 0xc026d3, roughness: 0.3, metalness: 0.6 }),
    bishopW: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.32, metalness: 0.55 }),
    bishopB: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.32, metalness: 0.55 }),
    knightW: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.38, metalness: 0.5 }),
    knightB: new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.38, metalness: 0.5 }),
    rookW: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.65 }),
    rookB: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.65 }),
    eyeW: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    eyeB: new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  };
}

function getRoleAccentMaterial(type, color, materials) {
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
 * Constrói o personagem 3D articulado conforme tipo e cor.
 * @param {'p'|'r'|'n'|'b'|'q'|'k'} type
 * @param {'w'|'b'} color
 * @param {object} materials
 * @returns {THREE.Group}
 */
export function buildLivingPiece(type, color, materials) {
  const root = new THREE.Group();
  const mainMat = materials[color];
  const accentMat = getRoleAccentMaterial(type, color, materials);
  const eyeMat = color === 'w' ? materials.eyeW : materials.eyeB;

  const base = new THREE.Mesh(SHARED_GEO.base, mainMat);
  base.position.y = 0.07;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  const body = new THREE.Group();
  body.position.y = 0.14;
  root.add(body);

  let head = new THREE.Group();
  let rightArm = new THREE.Group();
  let leftArm = new THREE.Group();

  if (type === 'p') {
    // Peão: Soldado medieval com elmo, escudo e lança
    const torso = new THREE.Mesh(SHARED_GEO.torso, mainMat);
    torso.position.y = 0.22;
    torso.scale.set(0.85, 0.8, 0.85);
    body.add(torso);

    head.position.y = 0.5;
    const skull = new THREE.Mesh(SHARED_GEO.head, mainMat);
    skull.scale.set(0.9, 0.9, 0.9);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), accentMat);
    visor.position.set(0, 0.02, 0.12);
    head.add(skull, visor);
    body.add(head);

    rightArm.position.set(0.2, 0.34, 0);
    const armMesh = new THREE.Mesh(SHARED_GEO.arm, mainMat);
    armMesh.position.y = -0.1;
    const spear = new THREE.Mesh(SHARED_GEO.sword, accentMat);
    spear.position.set(0, 0.05, 0.12);
    spear.rotation.x = 0.4;
    rightArm.add(armMesh, spear);
    body.add(rightArm);

    leftArm.position.set(-0.2, 0.34, 0.08);
    const shield = new THREE.Mesh(SHARED_GEO.shield, accentMat);
    shield.rotation.x = Math.PI / 2;
    leftArm.add(shield);
    body.add(leftArm);
  } else if (type === 'r') {
    // Torre: Golem fortificação viva com ameias e olhos brilhantes
    const tower = new THREE.Mesh(SHARED_GEO.towerBody, mainMat);
    tower.position.y = 0.31;
    body.add(tower);

    head.position.y = 0.64;
    const offsets = [
      [-0.16, -0.16],
      [0.16, -0.16],
      [-0.16, 0.16],
      [0.16, 0.16],
    ];
    for (const [ox, oz] of offsets) {
      const merlon = new THREE.Mesh(SHARED_GEO.battlement, accentMat);
      merlon.position.set(ox, 0.04, oz);
      head.add(merlon);
    }
    const eyeL = new THREE.Mesh(SHARED_GEO.orb, eyeMat);
    eyeL.scale.set(0.5, 0.5, 0.5);
    eyeL.position.set(-0.09, -0.15, 0.23);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.09;
    head.add(eyeL, eyeR);
    body.add(head);

    rightArm.position.set(0.3, 0.36, 0);
    const rBlock = new THREE.Mesh(SHARED_GEO.arm, accentMat);
    rBlock.scale.set(1.4, 1.1, 1.4);
    rightArm.add(rBlock);
    body.add(rightArm);

    leftArm.position.set(-0.3, 0.36, 0);
    const lBlock = rBlock.clone();
    leftArm.add(lBlock);
    body.add(leftArm);
  } else if (type === 'n') {
    // Cavalo: Corcel real articulado com 4 patas, pescoço arqueado, orelhas e focinho
    const chest = new THREE.Mesh(SHARED_GEO.horseBody, mainMat);
    chest.position.set(0, 0.32, 0);
    body.add(chest);

    const legCoords = [
      [-0.11, 0.12, 0.18],
      [0.11, 0.12, 0.18],
      [-0.11, 0.12, -0.18],
      [0.11, 0.12, -0.18],
    ];
    for (const [lx, ly, lz] of legCoords) {
      const leg = new THREE.Mesh(SHARED_GEO.horseLeg, mainMat);
      leg.position.set(lx, ly, lz);
      body.add(leg);
    }

    head.position.set(0, 0.52, 0.18);
    const neck = new THREE.Mesh(SHARED_GEO.horseNeck, mainMat);
    neck.rotation.x = 0.35;
    const muzzle = new THREE.Mesh(SHARED_GEO.horseHead, mainMat);
    muzzle.position.set(0, 0.16, 0.14);
    muzzle.rotation.x = 0.2;
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.08), accentMat);
    mane.position.set(0, 0.04, -0.1);
    mane.rotation.x = 0.35;
    const earL = new THREE.Mesh(SHARED_GEO.ear, accentMat);
    earL.position.set(-0.05, 0.28, 0.02);
    const earR = earL.clone();
    earR.position.x = 0.05;
    head.add(neck, muzzle, mane, earL, earR);
    body.add(head);
  } else if (type === 'b') {
    // Bispo: Clérigo real com mitra e cajado mágico
    const robe = new THREE.Mesh(SHARED_GEO.torso, mainMat);
    robe.position.y = 0.26;
    robe.scale.set(0.95, 1.15, 0.95);
    body.add(robe);

    head.position.y = 0.62;
    const skull = new THREE.Mesh(SHARED_GEO.head, mainMat);
    const mitre = new THREE.Mesh(SHARED_GEO.mitre, accentMat);
    mitre.position.y = 0.18;
    head.add(skull, mitre);
    body.add(head);

    rightArm.position.set(0.24, 0.38, 0.05);
    const staff = new THREE.Mesh(SHARED_GEO.staff, accentMat);
    staff.position.y = 0.12;
    const orb = new THREE.Mesh(SHARED_GEO.orb, eyeMat);
    orb.position.y = 0.5;
    rightArm.add(staff, orb);
    body.add(rightArm);
  } else if (type === 'q') {
    // Rainha: Guerreira real com manto, coroa dourada e cetro
    const dress = new THREE.Mesh(SHARED_GEO.torso, mainMat);
    dress.position.y = 0.3;
    dress.scale.set(1.05, 1.3, 1.05);
    const cape = new THREE.Mesh(SHARED_GEO.cape, accentMat);
    cape.position.set(0, 0.28, -0.2);
    cape.rotation.x = 0.15;
    body.add(dress, cape);

    head.position.y = 0.72;
    const skull = new THREE.Mesh(SHARED_GEO.head, mainMat);
    const crown = new THREE.Mesh(SHARED_GEO.crownRing, accentMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.13;
    const gem = new THREE.Mesh(SHARED_GEO.orb, eyeMat);
    gem.position.y = 0.2;
    head.add(skull, crown, gem);
    body.add(head);

    rightArm.position.set(0.26, 0.45, 0);
    const scepter = new THREE.Mesh(SHARED_GEO.sword, accentMat);
    scepter.position.set(0, 0.12, 0.1);
    scepter.rotation.x = 0.3;
    rightArm.add(scepter);
    body.add(rightArm);
  } else {
    // Rei: Comandante supremo com coroa pontuda, capa e espada longa
    const armor = new THREE.Mesh(SHARED_GEO.torso, mainMat);
    armor.position.y = 0.34;
    armor.scale.set(1.15, 1.45, 1.15);
    const cape = new THREE.Mesh(SHARED_GEO.cape, accentMat);
    cape.position.set(0, 0.32, -0.23);
    cape.scale.set(1.2, 1.2, 1);
    body.add(armor, cape);

    head.position.y = 0.8;
    const skull = new THREE.Mesh(SHARED_GEO.head, mainMat);
    const crown = new THREE.Mesh(SHARED_GEO.crownRing, accentMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.14;
    for (let i = 0; i < 4; i += 1) {
      const spike = new THREE.Mesh(SHARED_GEO.crownSpike, accentMat);
      const ang = (i * Math.PI) / 2;
      spike.position.set(Math.cos(ang) * 0.12, 0.2, Math.sin(ang) * 0.12);
      head.add(spike);
    }
    head.add(skull, crown);
    body.add(head);

    rightArm.position.set(0.3, 0.48, 0.05);
    const sword = new THREE.Mesh(SHARED_GEO.sword, accentMat);
    sword.scale.set(1.2, 1.3, 1.2);
    sword.position.set(0, 0.14, 0.1);
    sword.rotation.x = 0.25;
    rightArm.add(sword);
    body.add(rightArm);
  }

  // Face das peças brancas olha para -Z (frente do tabuleiro) e pretas para +Z
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
    parts: { body, head, rightArm, leftArm },
  };

  return root;
}
