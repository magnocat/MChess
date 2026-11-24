import gsap from 'gsap';
import {
  IdleAnimation,
  WalkingAnimation,
  FlyingAnimation,
  HitAnimation,
  WaveAnimation,
  CrouchAnimation,
} from 'skinview3d';

/**
 * Controla a máquina de estados de animação das peças vivas:
 * idle (respiração), selected, moving, attacking, scared, dying, victory.
 */
export class PieceAnimator {
  constructor() {
    this.activeTweens = new Set();
    this.skinIdle = new IdleAnimation();
    this.skinIdle.speed = 0.45;
    this.skinWalk = new WalkingAnimation();
    this.skinWalk.speed = 1.6;
    this.skinFly = new FlyingAnimation();
    this.skinHit = new HitAnimation();
    this.skinHit.speed = 2.0;
    this.skinWave = new WaveAnimation();
    this.skinCrouch = new CrouchAnimation();
  }

  /**
   * Atualiza respiração e animações contínuas a cada quadro.
   * @param {Iterable} pieces
   * @param {number} elapsedSec
   * @param {number} deltaSec
   */
  updateIdle(pieces, elapsedSec, deltaSec = 0.016) {
    const dt = Math.min(0.05, Math.max(0.001, deltaSec));
    for (const piece of pieces) {
      if (!piece || !piece.userData || !piece.userData.parts) continue;
      const {
        type,
        state,
        phase,
        parts,
        isSkinview,
        skinPlayer,
        isMinecraftHorse,
        isMinecraftRook,
        isAnimal,
        animateAnimal,
      } = piece.userData;

      if (isAnimal && animateAnimal) {
        const speed = state === 'moving' ? 8.5 : state === 'attacking' ? 12 : 0;
        animateAnimal(dt, speed, elapsedSec);
        if (state === 'scared') {
          parts.body.position.x = Math.sin(elapsedSec * 18 + phase) * 0.012;
        } else {
          parts.body.position.x = 0;
        }
        continue;
      }

      if (isMinecraftHorse) {
        if (state === 'moving') {
          const gallop = Math.sin(elapsedSec * 14 + phase) * 0.6;
          parts.legFL.rotation.x = gallop;
          parts.legBR.rotation.x = gallop;
          parts.legFR.rotation.x = -gallop;
          parts.legBL.rotation.x = -gallop;
          parts.head.rotation.x = Math.sin(elapsedSec * 7 + phase) * 0.14;
          parts.tail.rotation.z = Math.sin(elapsedSec * 10) * 0.22;
        } else if (state === 'scared') {
          parts.body.position.x = Math.sin(elapsedSec * 18 + phase) * 0.012;
          parts.head.rotation.z = Math.sin(elapsedSec * 14) * 0.08;
        } else {
          parts.body.position.x = 0;
          parts.legFL.rotation.x = 0;
          parts.legFR.rotation.x = 0;
          parts.legBL.rotation.x = 0;
          parts.legBR.rotation.x = 0;
          parts.head.rotation.x = Math.sin(elapsedSec * 0.8 + phase) * 0.05;
          parts.head.rotation.z = 0;
          parts.tail.rotation.z = Math.sin(elapsedSec * 1.4 + phase) * 0.08;
        }
        continue;
      }

      if (isMinecraftRook) {
        if (state === 'moving') {
          const march = Math.sin(elapsedSec * 9 + phase) * 0.42;
          parts.rightArm.rotation.x = march;
          parts.leftArm.rotation.x = -march;
          parts.body.position.y = Math.abs(Math.sin(elapsedSec * 9 + phase)) * 0.04;
        } else if (state === 'scared') {
          parts.body.position.x = Math.sin(elapsedSec * 18 + phase) * 0.012;
        } else {
          parts.body.position.x = 0;
          parts.body.position.y = Math.max(0, Math.sin(elapsedSec * 0.9 + phase) * 0.01);
          parts.rightArm.rotation.x = Math.sin(elapsedSec * 0.7 + phase) * 0.04;
          parts.leftArm.rotation.x = -Math.sin(elapsedSec * 0.7 + phase) * 0.04;
          parts.head.rotation.y = Math.sin(elapsedSec * 0.4 + phase) * 0.05;
        }
        continue;
      }

      if (isSkinview && skinPlayer) {
        const basePlayerY = piece.userData.basePlayerY ?? 0.496;
        if (state === 'moving') {
          if (type === 'q') {
            this.skinFly.update(skinPlayer, dt);
          } else {
            this.skinWalk.update(skinPlayer, dt);
          }
        } else if (state === 'attacking') {
          this.skinHit.update(skinPlayer, dt);
        } else if (state === 'victory') {
          this.skinWave.update(skinPlayer, dt);
        } else if (state === 'scared') {
          this.skinCrouch.update(skinPlayer, dt);
          skinPlayer.position.x = Math.sin(elapsedSec * 18 + phase) * 0.016;
        } else {
          skinPlayer.position.x = 0;
          this.skinIdle.update(skinPlayer, dt);
          if (type === 'b' || type === 'q') {
            skinPlayer.position.y = basePlayerY + Math.sin(elapsedSec * 1.1 + phase) * 0.025;
          }
        }
        continue;
      }

      if (state === 'idle' || state === 'selected') {
        const breath = Math.sin(elapsedSec * 1.1 + phase) * 0.014;
        parts.body.scale.y = 1 + breath;
        parts.body.scale.x = 1 - breath * 0.4;
        parts.head.rotation.y = Math.sin(elapsedSec * 0.45 + phase) * 0.07;
      } else if (state === 'scared') {
        // Tremor sutil de medo quando em xeque (sem sair da casa)
        parts.body.position.x = Math.sin(elapsedSec * 18 + phase) * 0.012;
        parts.head.rotation.z = Math.sin(elapsedSec * 16) * 0.06;
      } else {
        parts.body.position.x = 0;
        parts.head.rotation.z = 0;
      }
    }
  }

  setState(piece, state) {
    if (!piece || !piece.userData) return;
    piece.userData.state = state;
  }

  /**
   * Anima o movimento suave da peça até a casa de destino.
   * @param {THREE.Object3D} piece
   * @param {{x: number, z: number}} targetPos
   * @param {boolean} isKnight
   */
  animateMove(piece, targetPos, isKnight = false) {
    return new Promise((resolve) => {
      this.setState(piece, 'moving');
      const ud = piece.userData || {};
      const isWalkingRig = Boolean(
        ud.isSkinview || ud.isAnimal || ud.isMinecraftHorse || ud.isMinecraftRook,
      );
      const shouldWalkFlat = isWalkingRig && !isKnight;

      const tl = gsap.timeline({
        onComplete: () => {
          if (shouldWalkFlat) {
            piece.position.y = 0;
          }
          this.setState(piece, 'idle');
          resolve();
        },
      });

      if (shouldWalkFlat) {
        piece.position.y = 0;
        tl.to(piece.position, {
          x: targetPos.x,
          z: targetPos.z,
          duration: 0.56,
          ease: 'none',
        });
      } else {
        const jumpHeight = isKnight ? 0.75 : 0.22;
        tl.to(piece.position, {
          x: targetPos.x,
          z: targetPos.z,
          duration: 0.48,
          ease: 'power2.inOut',
        });
        tl.to(
          piece.position,
          {
            y: jumpHeight,
            duration: 0.24,
            yoyo: true,
            repeat: 1,
            ease: 'sine.out',
          },
          0,
        );
      }
    });
  }

  /**
   * Anima o ataque da peça capturadora e a queda/morte da peça capturada.
   * No Modo Especial, usa múltiplas finalizações aleatórias inspiradas no Battle Chess 3D (1988).
   */
  animateCombat(attacker, defender, specialMode = false) {
    return new Promise((resolve) => {
      this.setState(attacker, 'attacking');
      if (defender) this.setState(defender, 'scared');

      const origRotX = attacker.rotation.x;
      const origRotY = attacker.rotation.y;
      const origRotZ = attacker.rotation.z;
      const origPosY = attacker.position.y;
      const origScaleX = attacker.scale.x;
      const origScaleY = attacker.scale.y;
      const origScaleZ = attacker.scale.z;

      const aType = attacker.userData?.type || 'p';
      const armR = attacker.userData.parts?.rightArm;
      const armL = attacker.userData.parts?.leftArm;
      const body = attacker.userData.parts?.body;
      const pushDir = attacker.userData?.color === 'w' ? -1 : 1;

      const tl = gsap.timeline({
        onComplete: () => {
          attacker.rotation.set(origRotX, origRotY, origRotZ);
          attacker.position.y = origPosY;
          attacker.scale.set(origScaleX, origScaleY, origScaleZ);
          if (armR) armR.rotation.set(0, 0, 0);
          if (armL) armL.rotation.set(0, 0, 0);
          if (body) {
            body.rotation.set(0, 0, 0);
            body.scale.set(1, 1, 1);
          }
          this.setState(attacker, 'idle');
          resolve();
        },
      });

      if (!specialMode || !defender) {
        if (armR) {
          tl.to(armR.rotation, { x: -1.2, duration: 0.18, ease: 'power2.out' });
          tl.to(armR.rotation, { x: 0.5, duration: 0.15, ease: 'power3.in' });
          tl.to(armR.rotation, { x: 0, duration: 0.2 });
        }
        if (defender) {
          tl.to(defender.rotation, { x: Math.PI / 2, z: 0.4, duration: 0.35, ease: 'bounce.out' }, 0.18);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: 'power2.in' }, 0.45);
        }
        return;
      }

      // --- MODO ESPECIAL: Múltiplas finalizações inspiradas no Battle Chess 3D (1988) ---
      const pick = (count) => Math.floor(Math.random() * count);

      if (aType === 'p') {
        const variant = pick(3);
        if (variant === 0) {
          // Peão 1: Salto heroico com estocada frontal
          tl.to(attacker.position, { y: origPosY + 0.55, duration: 0.2, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.4, duration: 0.16 }, 0);
          if (armR) tl.to(armR.rotation, { x: 0.8, duration: 0.14, ease: 'power4.in' }, 0.18);
          tl.to(attacker.position, { y: origPosY, duration: 0.16, ease: 'bounce.out' }, 0.24);
          tl.to(defender.rotation, { x: -Math.PI / 2, duration: 0.36, ease: 'bounce.out' }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.52);
        } else if (variant === 1) {
          // Peão 2: Golpe de escudo giratório (empurrão lateral)
          if (armL) tl.to(armL.rotation, { y: 1.1, duration: 0.14 });
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.36, ease: 'power2.out' }, 0.05);
          tl.to(defender.position, { x: defender.position.x + 0.6 * pushDir, y: 0.35, duration: 0.25 }, 0.2);
          tl.to(defender.rotation, { z: Math.PI / 2, x: 0.6, duration: 0.32, ease: 'power2.in' }, 0.22);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.48);
        } else {
          // Peão 3: Combo rápido dupla estocada e queda seca
          if (armR) tl.to(armR.rotation, { x: -1.1, duration: 0.12 });
          if (armR) tl.to(armR.rotation, { x: 0.7, duration: 0.1 }, 0.12);
          if (armL) tl.to(armL.rotation, { x: -1.0, duration: 0.12 }, 0.18);
          if (armL) tl.to(armL.rotation, { x: 0.6, duration: 0.1 }, 0.3);
          tl.to(attacker.rotation, { x: 0.22, duration: 0.12, yoyo: true, repeat: 1 }, 0.22);
          tl.to(defender.rotation, { x: Math.PI / 2, z: -0.5, duration: 0.3, ease: 'power3.in' }, 0.28);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.5);
        }
      } else if (aType === 'n') {
        const variant = pick(3);
        if (variant === 0) {
          // Cavalo 1: Meia-volta e coice poderoso (clássico Battle Chess)
          tl.to(attacker.rotation, { y: origRotY + Math.PI, duration: 0.2, ease: 'power2.inOut' });
          tl.to(attacker.rotation, { x: origRotX + 0.45, duration: 0.14, ease: 'power2.out' });
          tl.to(attacker.position, { y: origPosY + 0.28, duration: 0.12, yoyo: true, repeat: 1 }, '<');
          tl.to(defender.position, { y: 1.1, z: defender.position.z + 1.4 * pushDir, duration: 0.38, ease: 'power2.out' }, 0.28);
          tl.to(defender.rotation, { x: Math.PI * 1.4, z: 1.2, duration: 0.38 }, 0.28);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.55);
          tl.to(attacker.rotation, { x: origRotX, y: origRotY, duration: 0.22 }, 0.55);
        } else if (variant === 1) {
          // Cavalo 2: Salto mortal e pisoteio esmagador
          tl.to(attacker.position, { y: origPosY + 1.25, duration: 0.26, ease: 'power2.out' });
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.42, ease: 'power1.inOut' }, 0);
          tl.to(attacker.position, { y: origPosY, duration: 0.18, ease: 'power4.in' });
          tl.to(defender.scale, { x: 1.35, y: 0.08, z: 1.35, duration: 0.16, ease: 'power3.in' }, 0.38);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.22 }, 0.58);
        } else {
          // Cavalo 3: Empinada real e investida em galope duplo
          tl.to(attacker.rotation, { x: origRotX - 0.38, duration: 0.16 });
          tl.to(attacker.position, { y: origPosY + 0.45, duration: 0.16, yoyo: true, repeat: 1 });
          tl.to(attacker.rotation, { x: origRotX + 0.25, duration: 0.14 });
          tl.to(defender.rotation, { z: 1.4, x: 0.8, duration: 0.32, ease: 'back.in(1.7)' }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.26 }, 0.5);
        }
      } else if (aType === 'r') {
        const variant = pick(3);
        if (variant === 0) {
          // Torre 1: Salto colossal e impacto sísmico esmagador
          tl.to(attacker.position, { y: origPosY + 0.82, duration: 0.25, ease: 'power2.out' });
          tl.to(attacker.position, { y: origPosY, duration: 0.15, ease: 'power4.in' });
          tl.to(defender.scale, { x: 1.45, y: 0.06, z: 1.45, duration: 0.16 }, 0.36);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.55);
        } else if (variant === 1) {
          // Torre 2: Golpe duplo em pinça de titã
          if (armR) tl.to(armR.rotation, { z: -0.8, x: -0.9, duration: 0.18 });
          if (armL) tl.to(armL.rotation, { z: 0.8, x: -0.9, duration: 0.18 }, 0);
          if (armR) tl.to(armR.rotation, { z: 0.4, x: 0.3, duration: 0.16 }, 0.2);
          if (armL) tl.to(armL.rotation, { z: -0.4, x: 0.3, duration: 0.16 }, 0.2);
          tl.to(attacker.scale, { x: origScaleX * 1.12, y: origScaleY * 1.12, z: origScaleZ * 1.12, duration: 0.16, yoyo: true, repeat: 1 }, 0.05);
          tl.to(defender.rotation, { x: Math.PI / 2, y: 1.2, duration: 0.34 }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.5);
        } else {
          // Torre 3: Giro de ariete com arremesso lateral
          tl.to(attacker.rotation, { y: origRotY - Math.PI * 2, duration: 0.38, ease: 'power2.inOut' });
          tl.to(defender.position, { y: 0.9, x: defender.position.x + 1.1 * pushDir, duration: 0.32, ease: 'power2.out' }, 0.2);
          tl.to(defender.rotation, { z: -Math.PI * 1.2, duration: 0.32 }, 0.2);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.48);
        }
      } else if (aType === 'b') {
        const variant = pick(3);
        if (variant === 0) {
          // Bispo 1: Levitação arcana e arremesso giratório
          if (armR) tl.to(armR.rotation, { x: -1.5, duration: 0.2 });
          tl.to(attacker.position, { y: origPosY + 0.34, duration: 0.2, yoyo: true, repeat: 1 }, 0);
          tl.to(defender.position, { y: 1.3, duration: 0.28, ease: 'power2.out' }, 0.18);
          tl.to(defender.rotation, { y: Math.PI * 3, x: 1.1, duration: 0.4 }, 0.18);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.48);
        } else if (variant === 1) {
          // Bispo 2: Vórtice mágico 360 graus (desmaterialização)
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.45, ease: 'power2.inOut' });
          tl.to(defender.rotation, { y: -Math.PI * 4, duration: 0.45 }, 0.08);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, ease: 'power2.in' }, 0.25);
        } else {
          // Bispo 3: Sopro sagrado (encolhe e afunda no chão)
          if (armR) tl.to(armR.rotation, { x: -1.2, z: -0.4, duration: 0.18 });
          if (armL) tl.to(armL.rotation, { x: -1.2, z: 0.4, duration: 0.18 }, 0);
          tl.to(attacker.position, { y: origPosY + 0.25, duration: 0.22, yoyo: true, repeat: 1 }, 0.08);
          tl.to(defender.position, { y: -0.35, duration: 0.36, ease: 'power2.in' }, 0.2);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3 }, 0.28);
        }
      } else if (aType === 'q') {
        const variant = pick(3);
        if (variant === 0) {
          // Rainha 1: Pirueta real + golpe de cetro
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.38, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.3, duration: 0.16 }, 0.12);
          if (armR) tl.to(armR.rotation, { x: 0.6, duration: 0.15 }, 0.28);
          tl.to(defender.rotation, { z: Math.PI / 2, y: 0.8, duration: 0.35, ease: 'power2.in' }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.5);
        } else if (variant === 1) {
          // Rainha 2: Levitação soberana e execução de cima
          tl.to(attacker.position, { y: origPosY + 0.6, duration: 0.22, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.5, duration: 0.2 }, 0);
          tl.to(attacker.position, { y: origPosY, duration: 0.16, ease: 'power3.in' }, 0.24);
          if (armR) tl.to(armR.rotation, { x: 0.7, duration: 0.15 }, 0.24);
          tl.to(defender.rotation, { x: Math.PI / 2, duration: 0.34, ease: 'bounce.out' }, 0.28);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.52);
        } else {
          // Rainha 3: Onda de choque imperial (defensor voa para longe)
          tl.to(attacker.scale, { x: origScaleX * 1.15, y: origScaleY * 1.15, z: origScaleZ * 1.15, duration: 0.18, yoyo: true, repeat: 1 });
          tl.to(attacker.rotation, { y: origRotY - Math.PI * 2, duration: 0.42, ease: 'power2.inOut' }, 0);
          tl.to(defender.position, { y: 1.4, z: defender.position.z + 1.3 * pushDir, duration: 0.36, ease: 'power2.out' }, 0.2);
          tl.to(defender.rotation, { x: -Math.PI, z: 1.5, duration: 0.36 }, 0.2);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.48);
        }
      } else {
        const variant = pick(3);
        if (variant === 0) {
          // Rei 1: Sentença real com salto curto e espada longa
          tl.to(attacker.position, { y: origPosY + 0.42, duration: 0.2, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.55, duration: 0.2 }, 0);
          tl.to(attacker.position, { y: origPosY, duration: 0.15, ease: 'power4.in' }, 0.22);
          if (armR) tl.to(armR.rotation, { x: 0.75, duration: 0.14 }, 0.22);
          tl.to(defender.rotation, { x: Math.PI / 2, z: 0.6, duration: 0.34, ease: 'bounce.out' }, 0.26);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.5);
        } else if (variant === 1) {
          // Rei 2: Golpe horizontal real com giro de 360 graus
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.4, ease: 'power2.inOut' });
          if (armR) tl.to(armR.rotation, { z: -1.2, duration: 0.16 }, 0.05);
          if (armR) tl.to(armR.rotation, { z: 0.5, duration: 0.16 }, 0.22);
          tl.to(defender.rotation, { z: -Math.PI / 2, y: -0.9, duration: 0.34, ease: 'power2.in' }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.5);
        } else {
          // Rei 3: Decreto real (imposição de aura e colapso do alvo)
          tl.to(attacker.position, { y: origPosY + 0.3, duration: 0.18, yoyo: true, repeat: 1 });
          tl.to(attacker.rotation, { x: origRotX - 0.18, duration: 0.16, yoyo: true, repeat: 1 }, 0);
          tl.to(defender.scale, { x: 1.2, y: 0.1, z: 1.2, duration: 0.22, ease: 'power3.in' }, 0.22);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.46);
        }
      }
    });
  }

  animateVictory(piece) {
    if (!piece) return;
    this.setState(piece, 'victory');
    gsap.to(piece.position, {
      y: 0.35,
      duration: 0.3,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onComplete: () => this.setState(piece, 'idle'),
    });
  }
}
