import gsap from 'gsap';
import {
  IdleAnimation,
  WalkingAnimation,
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
    this.skinWalk = new WalkingAnimation();
    this.skinWalk.speed = 1.8;
    this.skinHit = new HitAnimation();
    this.skinHit.speed = 2.2;
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
      const { state, phase, parts, isSkinview, skinPlayer } = piece.userData;

      if (isSkinview && skinPlayer) {
        if (state === 'moving') {
          this.skinWalk.update(skinPlayer, dt);
        } else if (state === 'attacking') {
          this.skinHit.update(skinPlayer, dt);
        } else if (state === 'victory') {
          this.skinWave.update(skinPlayer, dt);
        } else if (state === 'scared') {
          this.skinCrouch.update(skinPlayer, dt);
          skinPlayer.position.x = Math.sin(elapsedSec * 32 + phase) * 0.6;
        } else {
          skinPlayer.position.x = 0;
          this.skinIdle.update(skinPlayer, dt);
        }
        continue;
      }

      if (state === 'idle' || state === 'selected') {
        const breath = Math.sin(elapsedSec * 2.4 + phase) * 0.025;
        parts.body.scale.y = 1 + breath;
        parts.body.scale.x = 1 - breath * 0.4;
        parts.head.rotation.y = Math.sin(elapsedSec * 0.9 + phase) * 0.14;
      } else if (state === 'scared') {
        // Tremor de medo quando em xeque ou sob ameaça
        parts.body.position.x = Math.sin(elapsedSec * 36 + phase) * 0.025;
        parts.head.rotation.z = Math.sin(elapsedSec * 28) * 0.12;
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
      const tl = gsap.timeline({
        onComplete: () => {
          this.setState(piece, 'idle');
          resolve();
        },
      });

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
    });
  }

  /**
   * Anima o ataque da peça capturadora e a queda/morte da peça capturada.
   * No Modo Especial, cada combinação de peça atacante e defensora tem uma finalização própria.
   */
  animateCombat(attacker, defender, specialMode = false) {
    return new Promise((resolve) => {
      this.setState(attacker, 'attacking');
      if (defender) this.setState(defender, 'scared');

      const origRotY = attacker.rotation.y;
      const origPosY = attacker.position.y;
      const aType = attacker.userData?.type || 'p';
      const dType = defender?.userData?.type || 'p';
      const armR = attacker.userData.parts?.rightArm;
      const armL = attacker.userData.parts?.leftArm;
      const body = attacker.userData.parts?.body;

      const tl = gsap.timeline({
        onComplete: () => {
          attacker.rotation.set(0, origRotY, 0);
          attacker.position.y = origPosY;
          if (armR) armR.rotation.set(0, 0, 0);
          if (armL) armL.rotation.set(0, 0, 0);
          if (body) body.rotation.set(0, 0, 0);
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

      // --- MODO ESPECIAL: Finalizações exclusivas por peça atacante e defensora ---
      if (aType === 'n') {
        if (dType === 'q' || dType === 'k') {
          // Cavalo dá meia-volta e acerta um coice poderoso na Rainha/Rei
          tl.to(attacker.rotation, { y: origRotY + Math.PI, duration: 0.2, ease: 'power2.inOut' });
          tl.to(attacker.rotation, { x: 0.45, duration: 0.14, ease: 'power2.out' });
          tl.to(attacker.position, { y: 0.28, duration: 0.12, yoyo: true, repeat: 1 }, '<');
          tl.to(defender.position, { y: 1.1, z: defender.position.z + (attacker.userData.color === 'w' ? -1.4 : 1.4), duration: 0.38, ease: 'power2.out' }, 0.28);
          tl.to(defender.rotation, { x: Math.PI * 1.4, z: 1.2, duration: 0.38 }, 0.28);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.55);
          tl.to(attacker.rotation, { x: 0, y: origRotY, duration: 0.22 }, 0.55);
        } else if (dType === 'p') {
          // Cavalo salta bem alto e cai esmagando o Peão
          tl.to(attacker.position, { y: 1.25, duration: 0.26, ease: 'power2.out' });
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.42, ease: 'power1.inOut' }, 0);
          tl.to(attacker.position, { y: 0, duration: 0.18, ease: 'power4.in' });
          tl.to(defender.scale, { x: 1.35, y: 0.08, z: 1.35, duration: 0.16, ease: 'power3.in' }, 0.38);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.22 }, 0.58);
        } else {
          // Cavalo vs Torre/Bispo/Cavalo: investida em galope duplo
          tl.to(attacker.rotation, { x: -0.35, duration: 0.14 });
          tl.to(attacker.position, { y: 0.45, duration: 0.16, yoyo: true, repeat: 1 });
          tl.to(attacker.rotation, { x: 0.25, duration: 0.14 });
          tl.to(defender.rotation, { z: 1.4, x: 0.8, duration: 0.32, ease: 'back.in(1.7)' }, 0.22);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.26 }, 0.48);
        }
      } else if (aType === 'p') {
        if (dType === 'q' || dType === 'r') {
          // Peão vs Rainha/Torre: salto heroico com estocada de lança
          tl.to(attacker.position, { y: 0.55, duration: 0.2, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.4, duration: 0.16 }, 0);
          if (armR) tl.to(armR.rotation, { x: 0.8, duration: 0.14, ease: 'power4.in' }, 0.18);
          tl.to(attacker.position, { y: 0, duration: 0.16, ease: 'bounce.out' }, 0.24);
          tl.to(defender.rotation, { x: -Math.PI / 2, duration: 0.36, ease: 'bounce.out' }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.52);
        } else {
          // Peão vs Peão/Bispo/Cavalo: escudada + estocada
          if (armL) tl.to(armL.rotation, { y: 0.9, duration: 0.14 });
          if (armR) tl.to(armR.rotation, { x: -1.1, duration: 0.15 }, 0.1);
          if (armR) tl.to(armR.rotation, { x: 0.65, duration: 0.12 }, 0.25);
          tl.to(defender.rotation, { x: Math.PI / 2, z: -0.5, duration: 0.32, ease: 'power2.in' }, 0.22);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.48);
        }
      } else if (aType === 'r') {
        if (dType === 'p' || dType === 'n') {
          // Torre sobe e esmaga com impacto sísmico
          tl.to(attacker.position, { y: 0.78, duration: 0.25, ease: 'power2.out' });
          tl.to(attacker.position, { y: 0, duration: 0.15, ease: 'power4.in' });
          tl.to(defender.scale, { x: 1.4, y: 0.06, z: 1.4, duration: 0.15 }, 0.36);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.55);
        } else {
          // Torre vs Rainha/Bispo/Torre: golpe duplo em pinça
          if (armR) tl.to(armR.rotation, { z: -0.8, x: -0.9, duration: 0.18 });
          if (armL) tl.to(armL.rotation, { z: 0.8, x: -0.9, duration: 0.18 }, 0);
          if (armR) tl.to(armR.rotation, { z: 0.4, x: 0.3, duration: 0.16 }, 0.2);
          if (armL) tl.to(armL.rotation, { z: -0.4, x: 0.3, duration: 0.16 }, 0.2);
          tl.to(defender.rotation, { x: Math.PI / 2, y: 1.2, duration: 0.34 }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.5);
        }
      } else if (aType === 'b') {
        if (dType === 'p' || dType === 'r') {
          // Bispo: raio do cajado levita e arremessa girando
          if (armR) tl.to(armR.rotation, { x: -1.5, duration: 0.2 });
          tl.to(attacker.position, { y: 0.32, duration: 0.2, yoyo: true, repeat: 1 }, 0);
          tl.to(defender.position, { y: 1.3, duration: 0.28, ease: 'power2.out' }, 0.18);
          tl.to(defender.rotation, { y: Math.PI * 3, x: 1.1, duration: 0.4 }, 0.18);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.48);
        } else {
          // Bispo: vórtice arcano 360 graus
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.45, ease: 'power2.inOut' });
          tl.to(defender.rotation, { y: -Math.PI * 4, duration: 0.45 }, 0.08);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, ease: 'power2.in' }, 0.25);
        }
      } else if (aType === 'q') {
        if (dType === 'p' || dType === 'n') {
          // Rainha: pirueta elegante + golpe de cetro
          tl.to(attacker.rotation, { y: origRotY + Math.PI * 2, duration: 0.38, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.3, duration: 0.16 }, 0.12);
          if (armR) tl.to(armR.rotation, { x: 0.6, duration: 0.15 }, 0.28);
          tl.to(defender.rotation, { z: Math.PI / 2, y: 0.8, duration: 0.35, ease: 'power2.in' }, 0.24);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.24 }, 0.5);
        } else {
          // Rainha vs Torre/Bispo/Rainha: levitação e execução soberana
          tl.to(attacker.position, { y: 0.55, duration: 0.22, ease: 'power2.out' });
          if (armR) tl.to(armR.rotation, { x: -1.5, duration: 0.2 }, 0);
          tl.to(attacker.position, { y: 0, duration: 0.16, ease: 'power3.in' }, 0.24);
          if (armR) tl.to(armR.rotation, { x: 0.7, duration: 0.15 }, 0.24);
          tl.to(defender.rotation, { x: Math.PI / 2, duration: 0.34, ease: 'bounce.out' }, 0.28);
          tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.52);
        }
      } else {
        // Rei: sentença real com salto curto e espada longa
        tl.to(attacker.position, { y: 0.42, duration: 0.2, ease: 'power2.out' });
        if (armR) tl.to(armR.rotation, { x: -1.55, duration: 0.2 }, 0);
        tl.to(attacker.position, { y: 0, duration: 0.15, ease: 'power4.in' }, 0.22);
        if (armR) tl.to(armR.rotation, { x: 0.75, duration: 0.14 }, 0.22);
        tl.to(defender.rotation, { x: Math.PI / 2, z: 0.6, duration: 0.34, ease: 'bounce.out' }, 0.26);
        tl.to(defender.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 0.5);
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
