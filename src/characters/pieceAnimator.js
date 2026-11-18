import gsap from 'gsap';

/**
 * Controla a máquina de estados de animação das peças vivas:
 * idle (respiração), selected, moving, attacking, scared, dying, victory.
 */
export class PieceAnimator {
  constructor() {
    this.activeTweens = new Set();
  }

  /**
   * Atualiza respiração e micro-movimentos contínuos a cada quadro.
   * @param {Iterable} pieces
   * @param {number} elapsedSec
   */
  updateIdle(pieces, elapsedSec) {
    for (const piece of pieces) {
      if (!piece || !piece.userData || !piece.userData.parts) continue;
      const { state, phase, parts } = piece.userData;

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
   */
  animateCombat(attacker, defender) {
    return new Promise((resolve) => {
      this.setState(attacker, 'attacking');
      if (defender) this.setState(defender, 'scared');

      const tl = gsap.timeline({
        onComplete: () => {
          this.setState(attacker, 'idle');
          resolve();
        },
      });

      const arm = attacker.userData.parts?.rightArm;
      if (arm) {
        tl.to(arm.rotation, { x: -1.2, duration: 0.18, ease: 'power2.out' });
        tl.to(arm.rotation, { x: 0.5, duration: 0.15, ease: 'power3.in' });
        tl.to(arm.rotation, { x: 0, duration: 0.2 });
      }

      if (defender) {
        tl.to(
          defender.rotation,
          { x: Math.PI / 2, z: 0.4, duration: 0.35, ease: 'bounce.out' },
          0.18,
        );
        tl.to(
          defender.scale,
          { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: 'power2.in' },
          0.45,
        );
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
