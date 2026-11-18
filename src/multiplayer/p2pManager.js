import Peer from 'peerjs';
import { sanitizeText } from '../security/sanitizer.js';

/**
 * Gerenciador multiplayer P2P via WebRTC (PeerJS).
 * Permite convites 1 vs 1 por link sem servidor de banco de dados.
 */
export class P2PManager {
  constructor({ onStatus, onMove, onSync, onConnected, onDisconnected }) {
    this.peer = null;
    this.conn = null;
    this.peerId = null;
    this.isHost = false;
    this.onStatus = onStatus || (() => {});
    this.onMove = onMove || (() => {});
    this.onSync = onSync || (() => {});
    this.onConnected = onConnected || (() => {});
    this.onDisconnected = onDisconnected || (() => {});
  }

  /**
   * Inicia como anfitrião (Brancas) e gera link de convite.
   */
  hostRoom(syncPayload) {
    this.destroy();
    this.isHost = true;
    this.onStatus('Criando sala P2P...');

    this.peer = new Peer();
    this.peer.on('open', (id) => {
      this.peerId = id;
      const url = new URL(window.location.href);
      url.searchParams.set('sala', id);
      this.onStatus('Sala pronta. Compartilhe o link.', url.toString());
    });

    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.bindConnection(syncPayload);
    });

    this.peer.on('error', (err) => {
      this.onStatus(`Erro P2P: ${sanitizeText(err?.message || 'desconhecido', 80)}`);
    });
  }

  /**
   * Entra em uma sala existente como convidado (Pretas).
   */
  joinRoom(targetPeerId) {
    const cleanId = sanitizeText(targetPeerId, 64);
    if (!cleanId) return;

    this.destroy();
    this.isHost = false;
    this.onStatus('Conectando ao anfitrião...');

    this.peer = new Peer();
    this.peer.on('open', () => {
      this.conn = this.peer.connect(cleanId, { reliable: true });
      this.bindConnection(null);
    });

    this.peer.on('error', (err) => {
      this.onStatus(`Falha ao conectar: ${sanitizeText(err?.message || 'desconhecido', 80)}`);
    });
  }

  bindConnection(initialSyncPayload) {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.onStatus('Jogador conectado!');
      if (this.isHost && initialSyncPayload) {
        this.send({ type: 'SYNC', payload: initialSyncPayload });
      }
      this.onConnected(this.isHost);
    });

    this.conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'MOVE' && data.from && data.to) {
        this.onMove({
          from: sanitizeText(data.from, 2),
          to: sanitizeText(data.to, 2),
          promotion: sanitizeText(data.promotion || 'q', 1),
        });
      } else if (data.type === 'SYNC' && data.payload) {
        this.onSync(data.payload);
      }
    });

    this.conn.on('close', () => {
      this.onStatus('Oponente desconectou.');
      this.onDisconnected();
    });
  }

  sendMove(from, to, promotion = 'q') {
    this.send({ type: 'MOVE', from, to, promotion });
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  destroy() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.peerId = null;
  }
}
