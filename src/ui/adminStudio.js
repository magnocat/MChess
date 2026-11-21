import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  applyPiecePalette,
  buildLivingPiece,
  createPieceMaterials,
} from '../characters/pieceBuilder.js';
import { buildSkinviewPiece } from '../characters/skinviewPieceBuilder.js';
import { PieceAnimator } from '../characters/pieceAnimator.js';
import { COLOR_MODES } from '../accessibility/accessibilityManager.js';

const PIECE_NAMES = {
  k: 'Rei',
  q: 'Rainha',
  b: 'Bispo',
  n: 'Cavalo',
  r: 'Torre',
  p: 'Peão',
};

function describeFinisherId(aType, dType) {
  if (aType === 'n') {
    if (dType === 'q' || dType === 'k') return `${aType} -> ${dType} (Coice Real)`;
    if (dType === 'p') return `${aType} -> ${dType} (Salto Esmagador)`;
    return `${aType} -> ${dType} (Investida de Galope)`;
  }
  if (aType === 'p') {
    if (dType === 'q' || dType === 'r') return `${aType} -> ${dType} (Salto Heroico com Lança)`;
    return `${aType} -> ${dType} (Escudada + Estocada)`;
  }
  if (aType === 'r') {
    if (dType === 'p' || dType === 'n') return `${aType} -> ${dType} (Esmagamento Sísmico)`;
    return `${aType} -> ${dType} (Golpe Duplo em Pinça)`;
  }
  if (aType === 'b') {
    if (dType === 'p' || dType === 'r') return `${aType} -> ${dType} (Raio do Cajado)`;
    return `${aType} -> ${dType} (Vórtice Arcano 360)`;
  }
  if (aType === 'q') {
    if (dType === 'p' || dType === 'n') return `${aType} -> ${dType} (Pirueta com Cetro)`;
    return `${aType} -> ${dType} (Execução Soberana)`;
  }
  return `${aType} -> ${dType} (Sentença do Rei)`;
}

/**
 * Monta o Visualizador Stand Alone de peças, cores, animações, efeitos e finalizações no modo ADMIN.
 * @returns {() => void} Função de limpeza ao fechar.
 */
export function mountAdminPieceStudio(container, ui) {
  const state = {
    modelMode: 'animated',
    pieceType: 'n',
    color: 'w',
    colorMode: 'normal',
    animState: 'idle',
    effectId: 'none',
    defenderType: 'q',
  };

  const viewport = ui.el('div', '', 'studio-viewport');
  viewport.style.width = '100%';
  viewport.style.height = '240px';
  viewport.style.borderRadius = '8px';
  viewport.style.overflow = 'hidden';
  viewport.style.border = '1px solid var(--border)';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1120);

  const camera = new THREE.PerspectiveCamera(42, 420 / 240, 0.1, 40);
  camera.position.set(1.6, 1.8, 2.7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(420, 240);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  viewport.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.55, 0);
  controls.enableDamping = true;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xfffbeb, 0x334155, 0.95));
  const dir = new THREE.DirectionalLight(0xfff5d6, 1.3);
  dir.position.set(3, 6, 4);
  scene.add(dir);

  const materials = createPieceMaterials();
  const animator = new PieceAnimator();
  const floorGroup = new THREE.Group();
  const stageGroup = new THREE.Group();
  const fxGroup = new THREE.Group();
  scene.add(floorGroup, stageGroup, fxGroup);

  let mainPiece = null;
  let defenderPiece = null;
  let activeFx = [];
  let running = true;
  const clock = new THREE.Clock();

  const debugBox = ui.el('code', '', 'hwid-code');
  const updateDebugText = () => {
    const finisherDesc = describeFinisherId(state.pieceType, state.defenderType);
    debugBox.textContent =
      `MODELO: ${state.modelMode} | PEÇA: ${state.pieceType} (${PIECE_NAMES[state.pieceType]}) | ` +
      `COR: ${state.color} | DALTONISMO: ${state.colorMode} | ANIMAÇÃO: ${state.animState} | ` +
      `EFEITO: ${state.effectId} | FINALIZAÇÃO: ${finisherDesc}`;
  };

  const rebuildFloor = (palette) => {
    while (floorGroup.children.length > 0) {
      const m = floorGroup.children[0];
      floorGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    const lightCol = palette?.boardLight ?? 0xe2e8f0;
    const darkCol = palette?.boardDark ?? 0x334155;
    const geo = new THREE.BoxGeometry(1, 0.1, 1);
    for (let x = -1; x <= 0; x += 1) {
      for (let z = -1; z <= 0; z += 1) {
        const isLight = (x + z) % 2 === 0;
        const mesh = new THREE.Mesh(
          geo.clone(),
          new THREE.MeshStandardMaterial({ color: isLight ? lightCol : darkCol, roughness: 0.6 }),
        );
        mesh.position.set(x + 0.5, -0.05, z + 0.5);
        floorGroup.add(mesh);
      }
    }
    geo.dispose();
  };

  const createPieceForStudio = (type, color, palette) => {
    const piece =
      state.modelMode === 'animated'
        ? buildSkinviewPiece(type, color, palette, materials)
        : buildLivingPiece(type, color, materials);
    if (piece.userData.labelSprite) {
      piece.userData.labelSprite.visible = true;
    }
    return piece;
  };

  const rebuildPiece = () => {
    while (stageGroup.children.length > 0) {
      stageGroup.remove(stageGroup.children[0]);
    }
    defenderPiece = null;
    const palette = COLOR_MODES.find((m) => m.id === state.colorMode) || COLOR_MODES[0];
    applyPiecePalette(materials, palette);
    rebuildFloor(palette);

    mainPiece = createPieceForStudio(state.pieceType, state.color, palette);
    mainPiece.position.set(0, 0, 0);
    if (state.color === 'w') {
      mainPiece.rotation.y = 0; // no studio, olha para a câmera (+Z)
    } else {
      mainPiece.rotation.y = 0;
    }
    animator.setState(mainPiece, state.animState);
    stageGroup.add(mainPiece);
    updateDebugText();
  };

  const triggerEffect = (effectId) => {
    while (fxGroup.children.length > 0) {
      const m = fxGroup.children[0];
      fxGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    activeFx = [];
    if (effectId === 'none') return;

    const colors =
      effectId === 'win'
        ? [0xfacc15, 0x22c55e, 0x38bdf8]
        : effectId === 'loss'
          ? [0xef4444, 0xf97316, 0x991b1b]
          : [0x94a3b8, 0xe2e8f0, 0x38bdf8];

    const geo = new THREE.OctahedronGeometry(0.08, 0);
    for (let i = 0; i < 24; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo.clone(), mat);
      const ang = (i / 24) * Math.PI * 2;
      mesh.position.set(Math.cos(ang) * 0.4, 0.2, Math.sin(ang) * 0.4);
      mesh.userData = {
        vx: Math.cos(ang) * 0.8,
        vy: 1.2 + Math.random() * 1.6,
        vz: Math.sin(ang) * 0.8,
        age: 0,
      };
      fxGroup.add(mesh);
      activeFx.push(mesh);
    }
    geo.dispose();
  };

  const makeSelect = (label, options, initial, onChange) => {
    const wrap = ui.el('div');
    const lbl = ui.el('label', label);
    const sel = ui.el('select');
    for (const [val, text] of options) {
      const opt = ui.el('option', text);
      opt.value = val;
      if (val === initial) opt.selected = true;
      sel.append(opt);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    wrap.append(lbl, sel);
    return wrap;
  };

  const grid = ui.el('div', '', 'studio-grid');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '0.45rem';

  grid.append(
    makeSelect(
      'Modelo (ID)',
      [
        ['animated', 'animated (Modo Animado)'],
        ['classic', 'classic (Clássico)'],
      ],
      state.modelMode,
      (v) => {
        state.modelMode = v;
        rebuildPiece();
      },
    ),
    makeSelect(
      'Peça (ID)',
      [
        ['k', 'k — Rei'],
        ['q', 'q — Rainha'],
        ['b', 'b — Bispo'],
        ['n', 'n — Cavalo'],
        ['r', 'r — Torre'],
        ['p', 'p — Peão'],
      ],
      state.pieceType,
      (v) => {
        state.pieceType = v;
        rebuildPiece();
      },
    ),
    makeSelect(
      'Cor (ID)',
      [
        ['w', 'w — Brancas'],
        ['b', 'b — Pretas'],
      ],
      state.color,
      (v) => {
        state.color = v;
        rebuildPiece();
      },
    ),
    makeSelect(
      'Daltonismo (ID)',
      COLOR_MODES.map((m) => [m.id, `${m.id} — ${m.label}`]),
      state.colorMode,
      (v) => {
        state.colorMode = v;
        rebuildPiece();
      },
    ),
    makeSelect(
      'Animação (ID)',
      [
        ['idle', 'idle (Respiração)'],
        ['moving', 'moving (Movimento)'],
        ['scared', 'scared (Xeque / Medo)'],
        ['attacking', 'attacking (Ataque)'],
        ['victory', 'victory (Vitória)'],
      ],
      state.animState,
      (v) => {
        state.animState = v;
        if (mainPiece) animator.setState(mainPiece, v);
        updateDebugText();
      },
    ),
    makeSelect(
      'Efeito Especial (ID)',
      [
        ['none', 'none (Sem Efeito)'],
        ['win', 'win (Partículas Vitória)'],
        ['loss', 'loss (Partículas Derrota)'],
        ['draw', 'draw (Partículas Empate)'],
      ],
      state.effectId,
      (v) => {
        state.effectId = v;
        triggerEffect(v);
        updateDebugText();
      },
    ),
    makeSelect(
      'Alvo da Finalização (ID)',
      [
        ['q', 'q — Rainha'],
        ['k', 'k — Rei'],
        ['r', 'r — Torre'],
        ['b', 'b — Bispo'],
        ['n', 'n — Cavalo'],
        ['p', 'p — Peão'],
      ],
      state.defenderType,
      (v) => {
        state.defenderType = v;
        updateDebugText();
      },
    ),
  );

  const btnRow = ui.el('div', '', 'btn-row');
  const btnFinisher = ui.el('button', 'Executar Finalização', 'primary');
  btnFinisher.addEventListener('click', async () => {
    rebuildPiece();
    const palette = COLOR_MODES.find((m) => m.id === state.colorMode) || COLOR_MODES[0];
    const defColor = state.color === 'w' ? 'b' : 'w';
    defenderPiece = createPieceForStudio(state.defenderType, defColor, palette);
    defenderPiece.position.set(0, 0, -0.9);
    defenderPiece.rotation.y = Math.PI;
    stageGroup.add(defenderPiece);
    await animator.animateCombat(mainPiece, defenderPiece, true);
    if (defenderPiece) {
      stageGroup.remove(defenderPiece);
      defenderPiece = null;
    }
    animator.setState(mainPiece, state.animState);
  });

  const btnCopyIds = ui.el('button', 'Copiar IDs');
  btnCopyIds.addEventListener('click', async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(debugBox.textContent);
    }
  });
  btnRow.append(btnFinisher, btnCopyIds);

  container.append(viewport, debugBox, grid, btnRow);
  rebuildPiece();

  let elapsed = 0;
  const tick = () => {
    if (!running) return;
    requestAnimationFrame(tick);
    const delta = clock.getDelta();
    elapsed += delta;
    const list = [mainPiece, defenderPiece].filter(Boolean);
    animator.updateIdle(list, elapsed, delta);

    for (let i = activeFx.length - 1; i >= 0; i -= 1) {
      const p = activeFx[i];
      p.userData.age += delta;
      p.position.x += p.userData.vx * delta;
      p.position.y += p.userData.vy * delta;
      p.position.z += p.userData.vz * delta;
      p.userData.vy -= 1.8 * delta;
      p.material.opacity = Math.max(0, 1 - p.userData.age / 1.8);
      if (p.userData.age >= 1.8) {
        fxGroup.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        activeFx.splice(i, 1);
      }
    }

    controls.update();
    try {
      renderer.render(scene, camera);
    } catch {
      // Ignora erro pontual de quadro WebGL
    }
  };
  tick();

  return () => {
    running = false;
    controls.dispose();
    renderer.dispose();
  };
}
