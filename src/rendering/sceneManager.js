import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applyPiecePalette, buildLivingPiece, createPieceMaterials } from '../characters/pieceBuilder.js';
import { PieceAnimator } from '../characters/pieceAnimator.js';
import { getBiomeForSeed, ProceduralWorld } from './proceduralWorld.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function squareToWorld(square) {
  const fileIdx = FILES.indexOf(square[0]);
  const rankIdx = Number(square[1]) - 1;
  return {
    x: fileIdx - 3.5,
    z: 3.5 - rankIdx,
  };
}

/**
 * Gerencia a cena 3D Three.js, o tabuleiro, os destaques e a sincronização visual.
 */
export class SceneManager {
  constructor(container, { onSquareClick }) {
    this.container = container;
    this.onSquareClick = onSquareClick;
    this.lowQuality = /Mobi|Android/i.test(navigator.userAgent);
    this.specialMode = !this.lowQuality;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      80,
    );
    this.camera.position.set(0, 7.2, 8.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowQuality, powerPreference: 'high-performance' });
    this.applyQualitySettings();
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.12;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 17;
    this.controls.enablePan = false;

    this.setupLights();
    this.world = new ProceduralWorld(this.scene);
    this.animator = new PieceAnimator();
    this.pieceMaterials = createPieceMaterials();

    this.boardGroup = new THREE.Group();
    this.piecesGroup = new THREE.Group();
    this.highlightsGroup = new THREE.Group();
    this.scene.add(this.boardGroup, this.piecesGroup, this.highlightsGroup);

    this.squareMeshes = new Map();
    this.pieceMeshes = new Map();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.isAnimatingMove = false;
    this.currentSeed = 123456;
    this.colorPalette = {
      legalColor: 0x22c55e,
      captureColor: 0xef4444,
      selectedColor: 0xfacc15,
      boardLight: null,
      boardDark: null,
    };

    this.endEffects = [];
    this.buildBoardSquares(123456);
    this.bindEvents();
    this.startLoop();
  }

  setColorPalette(palette) {
    if (!palette) return;
    this.colorPalette = palette;
    applyPiecePalette(this.pieceMaterials, palette);
    this.buildBoardSquares(this.currentSeed);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x334155, 0.85);
    this.scene.add(hemi);

    this.dirLight = new THREE.DirectionalLight(0xfff5d6, 1.3);
    this.dirLight.position.set(6, 12, 7);
    this.dirLight.castShadow = !this.lowQuality;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.dirLight);
  }

  applyQualitySettings() {
    const dpr = this.lowQuality ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.container.clientWidth, Math.max(1, this.container.clientHeight));
    this.renderer.shadowMap.enabled = !this.lowQuality;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('low-quality', this.lowQuality);
    }
  }

  setLowQuality(enabled) {
    this.lowQuality = Boolean(enabled);
    this.applyQualitySettings();
    if (this.lowQuality) {
      this.clearEndEffects();
    }
  }

  setSpecialMode(enabled) {
    this.specialMode = Boolean(enabled);
  }

  buildBoardSquares(seed) {
    this.currentSeed = seed;
    while (this.boardGroup.children.length > 0) {
      const m = this.boardGroup.children[0];
      this.boardGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.squareMeshes.clear();

    const biome = getBiomeForSeed(seed);
    const lightCol = this.colorPalette?.boardLight ?? biome.boardLight;
    const darkCol = this.colorPalette?.boardDark ?? biome.boardDark;
    const sqGeo = new THREE.BoxGeometry(1, 0.14, 1);

    for (let rank = 1; rank <= 8; rank += 1) {
      for (let f = 0; f < 8; f += 1) {
        const square = `${FILES[f]}${rank}`;
        const isLight = (f + rank) % 2 === 1;
        const mat = new THREE.MeshStandardMaterial({
          color: isLight ? lightCol : darkCol,
          roughness: 0.55,
          metalness: 0.08,
        });
        const mesh = new THREE.Mesh(sqGeo, mat);
        const pos = squareToWorld(square);
        mesh.position.set(pos.x, -0.07, pos.z);
        mesh.receiveShadow = true;
        mesh.userData = { square };
        this.boardGroup.add(mesh);
        this.squareMeshes.set(square, mesh);
      }
    }
  }

  loadScenario(seed) {
    this.buildBoardSquares(seed);
    return this.world.build(seed, this.lowQuality);
  }

  /**
   * Sincroniza as peças 3D com o tabuleiro oficial do ChessEngine.
   */
  syncBoard(engine) {
    while (this.piecesGroup.children.length > 0) {
      this.piecesGroup.remove(this.piecesGroup.children[0]);
    }
    this.pieceMeshes.clear();

    const board = engine.getBoard();
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const cell = board[r][c];
        if (!cell) continue;
        const square = `${FILES[c]}${8 - r}`;
        const piece = buildLivingPiece(cell.type, cell.color, this.pieceMaterials);
        const pos = squareToWorld(square);
        piece.position.set(pos.x, 0, pos.z);
        piece.userData.square = square;
        this.piecesGroup.add(piece);
        this.pieceMeshes.set(square, piece);
      }
    }

    this.updateThreatStates(engine);
  }

  updateThreatStates(engine) {
    const inCheck = engine.isCheck();
    const turn = engine.getTurn();
    for (const piece of this.pieceMeshes.values()) {
      if (inCheck && piece.userData.type === 'k' && piece.userData.color === turn) {
        this.animator.setState(piece, 'scared');
      } else if (piece.userData.state === 'scared') {
        this.animator.setState(piece, 'idle');
      }
    }
  }

  showHighlights(selectedSquare, legalMoves, cursorSquare = null) {
    while (this.highlightsGroup.children.length > 0) {
      const m = this.highlightsGroup.children[0];
      this.highlightsGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }

    if (cursorSquare) {
      const pos = squareToWorld(cursorSquare);
      const cursorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.48, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
      );
      cursorRing.rotation.x = -Math.PI / 2;
      cursorRing.rotation.z = Math.PI / 4;
      cursorRing.position.set(pos.x, 0.03, pos.z);
      this.highlightsGroup.add(cursorRing);
    }

    if (selectedSquare) {
      const pos = squareToWorld(selectedSquare);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.44, 24),
        new THREE.MeshBasicMaterial({
          color: this.colorPalette?.selectedColor ?? 0xfacc15,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.02, pos.z);
      this.highlightsGroup.add(ring);
    }

    for (const move of legalMoves) {
      const pos = squareToWorld(move.to);
      const isCapture = Boolean(move.captured);
      const marker = new THREE.Mesh(
        new THREE.CircleGeometry(isCapture ? 0.36 : 0.16, 20),
        new THREE.MeshBasicMaterial({
          color: isCapture
            ? (this.colorPalette?.captureColor ?? 0xef4444)
            : (this.colorPalette?.legalColor ?? 0x22c55e),
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        }),
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(pos.x, 0.025, pos.z);
      this.highlightsGroup.add(marker);
    }
  }

  /**
   * Executa a animação 3D do lance (com combate se houver captura) e sincroniza.
   */
  async playMoveAnimation(moveObj, engine) {
    this.isAnimatingMove = true;
    const attacker = this.pieceMeshes.get(moveObj.from);
    const defender = this.pieceMeshes.get(moveObj.to);
    const targetPos = squareToWorld(moveObj.to);

    if (attacker) {
      await this.animator.animateMove(attacker, targetPos, moveObj.piece === 'n');
      if (moveObj.captured && defender) {
        await this.animator.animateCombat(attacker, defender, this.specialMode && !this.lowQuality);
      }
    }

    this.syncBoard(engine);
    if (engine.isCheckmate()) {
      const winnerColor = engine.getTurn() === 'w' ? 'b' : 'w';
      for (const p of this.pieceMeshes.values()) {
        if (p.userData.color === winnerColor && p.userData.type === 'k') {
          this.animator.animateVictory(p);
        }
      }
    }
    this.isAnimatingMove = false;
  }

  setCameraPreset(preset) {
    if (preset === 'w') {
      this.camera.position.set(0, 7.2, 8.2);
    } else if (preset === 'b') {
      this.camera.position.set(0, 7.2, -8.2);
    } else if (preset === 'top') {
      this.camera.position.set(0, 12.0, 0.01);
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  bindEvents() {
    this.renderer.domElement.addEventListener('pointerdown', (ev) => {
      if (this.isAnimatingMove) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const targets = [...this.squareMeshes.values(), ...this.piecesGroup.children];
      const hits = this.raycaster.intersectObjects(targets, true);
      if (hits.length === 0) return;

      let obj = hits[0].object;
      while (obj && !obj.userData?.square) {
        obj = obj.parent;
      }
      if (obj?.userData?.square) {
        this.onSquareClick(obj.userData.square);
      }
    });

    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = Math.max(1, this.container.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  clearEndEffects() {
    for (const fx of this.endEffects) {
      this.scene.remove(fx.group);
      fx.group.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
    this.endEffects = [];
  }

  /**
   * Dispara efeitos 3D de fim de partida (desativados no Modo Leve).
   * @param {'win'|'loss'|'draw'} result
   */
  playEndGameEffect(result) {
    if (this.lowQuality) return;
    this.clearEndEffects();

    const colors =
      result === 'win'
        ? [0xfacc15, 0x22c55e, 0x38bdf8]
        : result === 'loss'
          ? [0xef4444, 0xf97316, 0x991b1b]
          : [0x94a3b8, 0xe2e8f0, 0x38bdf8];

    const group = new THREE.Group();
    const particles = [];
    const geo = new THREE.OctahedronGeometry(0.11, 0);

    for (let i = 0; i < 36; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo.clone(), mat);
      const angle = (i / 36) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 2.8;
      mesh.position.set(Math.cos(angle) * radius, 0.3 + Math.random() * 0.5, Math.sin(angle) * radius);
      mesh.userData = {
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.5 + Math.random() * 2.4,
        vz: (Math.random() - 0.5) * 1.4,
        spin: (Math.random() - 0.5) * 6,
      };
      group.add(mesh);
      particles.push(mesh);
    }
    geo.dispose();

    this.scene.add(group);
    this.endEffects.push({ group, particles, startedAt: this.clock.getElapsedTime() });
  }

  startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);
      const elapsed = this.clock.getElapsedTime();
      this.animator.updateIdle(this.pieceMeshes.values(), elapsed);
      this.world.update(elapsed);

      for (let i = this.endEffects.length - 1; i >= 0; i -= 1) {
        const fx = this.endEffects[i];
        const age = elapsed - fx.startedAt;
        if (age > 2.8) {
          this.scene.remove(fx.group);
          fx.group.traverse((child) => {
            if (child.isMesh) {
              child.geometry.dispose();
              child.material.dispose();
            }
          });
          this.endEffects.splice(i, 1);
          continue;
        }
        const fade = Math.max(0, 1 - age / 2.8);
        for (const p of fx.particles) {
          p.position.x += p.userData.vx * 0.016;
          p.position.y += p.userData.vy * 0.016;
          p.position.z += p.userData.vz * 0.016;
          p.userData.vy -= 0.03;
          p.rotation.y += p.userData.spin * 0.016;
          p.material.opacity = fade;
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }
}
