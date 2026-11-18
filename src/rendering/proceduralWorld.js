import * as THREE from 'three';

/**
 * Gerador procedural de mundos e paisagens 3D.
 * Cria água animada, árvores, montanhas, espaço sideral, castelos e cristais.
 */

const BIOMES = [
  {
    id: 'forest',
    name: 'Floresta e Lago',
    sky: 0x1e3a5f,
    fog: 0x1e3a5f,
    boardLight: 0xecdec4,
    boardDark: 0x3b6e4c,
    frame: 0x4a3222,
    ground: 0x2d6a4f,
    water: 0x0ea5e9,
    particle: 0xfef08a,
    hasWater: true,
    hasSun: true,
  },
  {
    id: 'space',
    name: 'Espaço Sideral',
    sky: 0x050714,
    fog: 0x050714,
    boardLight: 0xe2e8f0,
    boardDark: 0x1e1b4b,
    frame: 0x312e81,
    ground: 0x0f172a,
    water: null,
    particle: 0xffffff,
    hasWater: false,
    hasSun: false,
  },
  {
    id: 'castle',
    name: 'Castelo Medieval',
    sky: 0x1c1926,
    fog: 0x1c1926,
    boardLight: 0xd6d3d1,
    boardDark: 0x44403c,
    frame: 0x292524,
    ground: 0x3f3f46,
    water: 0x1d4ed8,
    particle: 0xfb923c,
    hasWater: true,
    hasSun: false,
  },
  {
    id: 'crystal',
    name: 'Caverna de Cristais',
    sky: 0x0f1024,
    fog: 0x0f1024,
    boardLight: 0xcbd5e1,
    boardDark: 0x3730a3,
    frame: 0x1e1b4b,
    ground: 0x1e1b4b,
    water: 0x06b6d4,
    particle: 0x67e8f9,
    hasWater: true,
    hasSun: false,
  },
  {
    id: 'tundra',
    name: 'Montanhas Nevadas',
    sky: 0x162a42,
    fog: 0x162a42,
    boardLight: 0xf8fafc,
    boardDark: 0x3b82f6,
    frame: 0x1e3a8a,
    ground: 0xcbd5e1,
    water: 0x38bdf8,
    particle: 0xe0f2fe,
    hasWater: true,
    hasSun: true,
  },
  {
    id: 'desert',
    name: 'Oásis do Deserto',
    sky: 0x3b2614,
    fog: 0x3b2614,
    boardLight: 0xfef3c7,
    boardDark: 0xb45309,
    frame: 0x78350f,
    ground: 0xd97706,
    water: 0x0284c7,
    particle: 0xfde68a,
    hasWater: true,
    hasSun: true,
  },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getBiomeForSeed(seed) {
  const index = Math.abs(Math.floor(seed)) % BIOMES.length;
  return BIOMES[index];
}

export class ProceduralWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.particles = null;
    this.waterMesh = null;
    this.orbitingBodies = [];
    this.scene.add(this.group);
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      child.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((m) => m.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
    }
    this.particles = null;
    this.waterMesh = null;
    this.orbitingBodies = [];
  }

  /**
   * Constrói a paisagem 3D completa conforme o bioma da seed.
   */
  build(seed, lowQuality = false) {
    this.clear();
    const biome = getBiomeForSeed(seed);
    const rand = mulberry32(seed);

    this.scene.background = new THREE.Color(biome.sky);
    this.scene.fog = new THREE.FogExp2(biome.fog, biome.id === 'space' ? 0.012 : 0.022);

    // Moldura da mesa de xadrez
    const frameGeo = new THREE.BoxGeometry(9.2, 0.5, 9.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: biome.frame, roughness: 0.7 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.26;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);

    if (biome.id === 'space') {
      this.buildSpaceWorld(rand, lowQuality);
    } else {
      this.buildLandscapeWorld(biome, rand, lowQuality);
    }

    // Partículas ambientais (estrelas, vaga-lumes, neve ou brasas)
    const count = lowQuality ? 60 : 150;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pPos[i * 3] = (rand() - 0.5) * 42;
      pPos[i * 3 + 1] = biome.id === 'space' ? (rand() - 0.5) * 28 : 0.5 + rand() * 10;
      pPos[i * 3 + 2] = (rand() - 0.5) * 42;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: biome.particle,
      size: biome.id === 'space' ? 0.18 : 0.14,
      transparent: true,
      opacity: 0.85,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);

    return biome;
  }

  buildSpaceWorld(rand, lowQuality) {
    // Plataforma espacial translúcida abaixo do tabuleiro
    const pedGeo = new THREE.CylinderGeometry(5.5, 3.2, 0.7, 8);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.7,
      roughness: 0.25,
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.85;
    this.group.add(ped);

    // Planeta gigante com anéis ao fundo
    const planetGeo = new THREE.SphereGeometry(3.8, lowQuality ? 16 : 28, lowQuality ? 12 : 20);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.6,
      emissive: 0x1e1b4b,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.position.set(-14, 7, -18);
    const ringGeo = new THREE.RingGeometry(4.8, 6.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.6;
    ring.rotation.y = 0.3;
    planet.add(ring);
    this.group.add(planet);
    this.orbitingBodies.push({ mesh: planet, speed: 0.08, radius: 0 });

    // Lua e asteroides orbitando
    const astGeo = new THREE.DodecahedronGeometry(0.45, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const astCount = lowQuality ? 12 : 24;
    for (let i = 0; i < astCount; i += 1) {
      const ast = new THREE.Mesh(astGeo, astMat);
      const angle = rand() * Math.PI * 2;
      const dist = 8.5 + rand() * 11;
      const scale = 0.5 + rand() * 1.4;
      ast.scale.setScalar(scale);
      ast.position.set(Math.cos(angle) * dist, -1.5 + rand() * 6, Math.sin(angle) * dist);
      this.group.add(ast);
      this.orbitingBodies.push({
        mesh: ast,
        angle,
        dist,
        y: ast.position.y,
        speed: 0.06 + rand() * 0.1,
      });
    }
  }

  buildLandscapeWorld(biome, rand, lowQuality) {
    // Plano de água animada ao redor da ilha do tabuleiro
    if (biome.hasWater) {
      const waterGeo = new THREE.PlaneGeometry(65, 65, lowQuality ? 8 : 20, lowQuality ? 8 : 20);
      const waterMat = new THREE.MeshStandardMaterial({
        color: biome.water,
        roughness: 0.18,
        metalness: 0.45,
        transparent: true,
        opacity: 0.82,
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.y = -1.1;
      this.group.add(this.waterMesh);
    }

    // Ilha / terreno base ao redor da mesa
    const islandGeo = new THREE.CylinderGeometry(8.2, 9.8, 1.2, 16);
    const islandMat = new THREE.MeshStandardMaterial({ color: biome.ground, roughness: 0.9 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -1.12;
    island.receiveShadow = true;
    this.group.add(island);

    // Sol ou Lua no horizonte
    const celestialGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const celestialMat = new THREE.MeshBasicMaterial({
      color: biome.hasSun ? 0xfde047 : 0xe2e8f0,
    });
    const celestial = new THREE.Mesh(celestialGeo, celestialMat);
    celestial.position.set(16, 13, -24);
    this.group.add(celestial);

    // Montanhas ao fundo
    const mtnCount = lowQuality ? 8 : 14;
    const mtnGeo = new THREE.ConeGeometry(3.2, 7.5, 6);
    const mtnMat = new THREE.MeshStandardMaterial({
      color: biome.id === 'tundra' ? 0xf1f5f9 : 0x475569,
      roughness: 0.9,
    });
    for (let i = 0; i < mtnCount; i += 1) {
      const ang = (i / mtnCount) * Math.PI * 2 + rand() * 0.3;
      const dist = 16 + rand() * 9;
      const mtn = new THREE.Mesh(mtnGeo, mtnMat);
      const s = 0.7 + rand() * 1.1;
      mtn.scale.set(s, s * (0.8 + rand() * 0.7), s);
      mtn.position.set(Math.cos(ang) * dist, -1.2 + (3.5 * mtn.scale.y) / 2, Math.sin(ang) * dist);
      this.group.add(mtn);
    }

    // Elementos específicos por bioma: Árvores, Torres de Castelo ou Cristais
    const propCount = lowQuality ? 10 : 20;
    for (let i = 0; i < propCount; i += 1) {
      const ang = rand() * Math.PI * 2;
      const dist = 6.2 + rand() * 2.4;
      const px = Math.cos(ang) * dist;
      const pz = Math.sin(ang) * dist;

      if (biome.id === 'forest' || biome.id === 'tundra') {
        this.addTree(px, -0.5, pz, biome.id === 'tundra', rand);
      } else if (biome.id === 'castle') {
        this.addCastlePillar(px, -0.5, pz);
      } else if (biome.id === 'crystal') {
        this.addCrystalCluster(px, -0.5, pz, rand);
      } else if (biome.id === 'desert') {
        this.addCactusOrPalm(px, -0.5, pz, rand);
      }
    }
  }

  addTree(x, y, z, isPine, rand) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 1.1, 7),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }),
    );
    trunk.position.y = 0.55;
    tree.add(trunk);

    const leafColor = isPine ? 0x14532d : 0x16a34a;
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8 });
    if (isPine) {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 7), leafMat);
      c1.position.y = 1.45;
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 7), leafMat);
      c2.position.y = 2.05;
      tree.add(c1, c2);
    } else {
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), leafMat);
      crown.position.y = 1.45;
      tree.add(crown);
    }
    tree.position.set(x, y, z);
    tree.scale.setScalar(0.8 + rand() * 0.55);
    this.group.add(tree);
  }

  addCastlePillar(x, y, z) {
    const pillar = new THREE.Group();
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 }),
    );
    stone.position.y = 0.9;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.42, 6),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    flame.position.y = 2.0;
    pillar.add(stone, flame);
    pillar.position.set(x, y, z);
    this.group.add(pillar);
  }

  addCrystalCluster(x, y, z, rand) {
    const shard = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color: rand() > 0.5 ? 0x06b6d4 : 0xa855f7,
        emissive: 0x1e1b4b,
        roughness: 0.2,
        metalness: 0.3,
      }),
    );
    shard.scale.set(0.7, 1.6 + rand(), 0.7);
    shard.position.set(x, y + 0.6, z);
    shard.rotation.z = (rand() - 0.5) * 0.4;
    this.group.add(shard);
  }

  addCactusOrPalm(x, y, z, rand) {
    const cactus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 1.3 + rand() * 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 }),
    );
    cactus.position.set(x, y + 0.65, z);
    this.group.add(cactus);
  }

  update(elapsedSec) {
    if (this.particles) {
      this.particles.rotation.y = elapsedSec * 0.03;
    }
    if (this.waterMesh) {
      this.waterMesh.position.y = -1.1 + Math.sin(elapsedSec * 1.4) * 0.07;
    }
    for (const body of this.orbitingBodies) {
      if (body.dist) {
        const a = body.angle + elapsedSec * body.speed;
        body.mesh.position.x = Math.cos(a) * body.dist;
        body.mesh.position.z = Math.sin(a) * body.dist;
        body.mesh.rotation.y = elapsedSec * 0.4;
      } else {
        body.mesh.rotation.y = elapsedSec * body.speed;
      }
    }
  }
}
