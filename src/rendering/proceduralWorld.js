import * as THREE from 'three';

/**
 * Gerador procedural de cenário estilo Minecraft usando InstancedMesh.
 * A mesma seed gera sempre o mesmo bioma e relevo.
 */

const BIOMES = [
  {
    name: 'Floresta Esmeralda',
    sky: 0x162436,
    fog: 0x162436,
    boardLight: 0xe6d5b8,
    boardDark: 0x4a6b53,
    frame: 0x3d2b1f,
    blocks: [0x2d6a4f, 0x40916c, 0x52b788, 0x6c584c],
    particle: 0xfef08a,
  },
  {
    name: 'Castelo de Pedra',
    sky: 0x1c1926,
    fog: 0x1c1926,
    boardLight: 0xd6d3d1,
    boardDark: 0x44403c,
    frame: 0x292524,
    blocks: [0x57534e, 0x78716c, 0x44403c, 0xa8a29e],
    particle: 0xfb923c,
  },
  {
    name: 'Caverna de Cristal',
    sky: 0x0f1024,
    fog: 0x0f1024,
    boardLight: 0xcbd5e1,
    boardDark: 0x312e81,
    frame: 0x1e1b4b,
    blocks: [0x1e1b4b, 0x4338ca, 0x06b6d4, 0x7c3aed],
    particle: 0x67e8f9,
  },
  {
    name: 'Ruínas do Deserto',
    sky: 0x2a1f14,
    fog: 0x2a1f14,
    boardLight: 0xfef3c7,
    boardDark: 0xb45309,
    frame: 0x78350f,
    blocks: [0xd97706, 0xf59e0b, 0xb45309, 0x92400e],
    particle: 0xfde68a,
  },
  {
    name: 'Tundra Gelada',
    sky: 0x0c1b2a,
    fog: 0x0c1b2a,
    boardLight: 0xf1f5f9,
    boardDark: 0x3b82f6,
    frame: 0x1e3a8a,
    blocks: [0xe2e8f0, 0x93c5fd, 0x60a5fa, 0x38bdf8],
    particle: 0xe0f2fe,
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
    this.scene.add(this.group);
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.particles = null;
  }

  /**
   * Constrói o terreno voxel ao redor da mesa de xadrez usando a seed.
   * @param {number} seed
   * @param {boolean} lowQuality
   */
  build(seed, lowQuality = false) {
    this.clear();
    const biome = getBiomeForSeed(seed);
    const rand = mulberry32(seed);

    this.scene.background = new THREE.Color(biome.sky);
    this.scene.fog = new THREE.FogExp2(biome.fog, 0.032);

    // Moldura da mesa de xadrez
    const frameGeo = new THREE.BoxGeometry(9.2, 0.5, 9.2);
    const frameMat = new THREE.MeshStandardMaterial({
      color: biome.frame,
      roughness: 0.7,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.26;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);

    // Blocos estilo Minecraft ao redor do tabuleiro
    const radius = lowQuality ? 9 : 12;
    const positions = [];
    const colors = [];

    for (let gx = -radius; gx <= radius; gx += 1) {
      for (let gz = -radius; gz <= radius; gz += 1) {
        // Deixa o centro livre para o tabuleiro 8x8
        if (Math.abs(gx) <= 5 && Math.abs(gz) <= 5) continue;
        const dist = Math.hypot(gx, gz);
        if (dist > radius + 1) continue;

        const height = Math.max(
          1,
          Math.floor(1 + rand() * 3 + Math.sin(gx * 0.45 + seed) * 1.3 + Math.cos(gz * 0.45) * 1.3),
        );
        for (let gy = 0; gy < height; gy += 1) {
          positions.push([gx, -1.2 + gy * 0.95, gz]);
          const colHex = biome.blocks[Math.floor(rand() * biome.blocks.length)];
          colors.push(new THREE.Color(colHex));
        }

        // Árvores ou pilares voxel ocasionais
        if (rand() > 0.93 && dist > 6.5) {
          for (let ty = 1; ty <= 3; ty += 1) {
            positions.push([gx, -1.2 + (height + ty - 1) * 0.95, gz]);
            colors.push(new THREE.Color(biome.blocks[3] || biome.blocks[0]));
          }
        }
      }
    }

    const blockGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const blockMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
    const instanced = new THREE.InstancedMesh(blockGeo, blockMat, positions.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < positions.length; i += 1) {
      const [px, py, pz] = positions[i];
      dummy.position.set(px, py, pz);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
      instanced.setColorAt(i, colors[i]);
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    instanced.receiveShadow = true;
    this.group.add(instanced);

    // Partículas ambientais animadas (vaga-lumes / neve / brasas)
    const count = lowQuality ? 40 : 90;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pPos[i * 3] = (rand() - 0.5) * 20;
      pPos[i * 3 + 1] = 0.5 + rand() * 6;
      pPos[i * 3 + 2] = (rand() - 0.5) * 20;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: biome.particle,
      size: 0.14,
      transparent: true,
      opacity: 0.8,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);

    return biome;
  }

  update(elapsedSec) {
    if (this.particles) {
      this.particles.rotation.y = elapsedSec * 0.04;
      this.particles.position.y = Math.sin(elapsedSec * 0.8) * 0.2;
    }
  }
}
