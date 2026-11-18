/**
 * Gerenciador de áudio via Web Audio API e faixas MP3 opcionais (Google Flow).
 * Controla música, efeitos sonoros e vozes de forma independente.
 */

export const MUSIC_TRACKS = [
  { id: 'track1', label: 'Faixa 1 (Google Flow)', url: './audio/music/track1.mp3' },
  { id: 'track2', label: 'Faixa 2 (Google Flow)', url: './audio/music/track2.mp3' },
  { id: 'track3', label: 'Faixa 3 (Google Flow)', url: './audio/music/track3.mp3' },
  { id: 'track4', label: 'Faixa 4 (Google Flow)', url: './audio/music/track4.mp3' },
  { id: 'track5', label: 'Faixa 5 (Google Flow)', url: './audio/music/track5.mp3' },
  { id: 'track6', label: 'Faixa 6 (Google Flow)', url: './audio/music/track6.mp3' },
  { id: 'track7', label: 'Faixa 7 (Google Flow)', url: './audio/music/track7.mp3' },
  { id: 'synth', label: 'Sintetizador Nativo (Leve)', url: null },
];

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicEnabled = false;
    this.sfxEnabled = true;
    this.voicesEnabled = true;

    this.musicVolume = 0.25;
    this.sfxVolume = 0.6;
    this.voicesVolume = 0.85;

    this.selectedTrackId = this.pickRandomTrackId();
    this.audioEl = null;
    this.musicTimer = null;
    this.noteStep = 0;
  }

  pickRandomTrackId() {
    const idx = Math.floor(Math.random() * 7) + 1;
    return `track${idx}`;
  }

  selectRandomTrack() {
    this.setMusicTrack(this.pickRandomTrackId());
    return this.selectedTrackId;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMusicTrack(trackId) {
    this.selectedTrackId = trackId;
    if (this.musicEnabled) {
      this.stopMusicLoop();
      this.startMusicLoop();
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (this.musicEnabled) {
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
  }

  setVoicesEnabled(enabled) {
    this.voicesEnabled = Boolean(enabled);
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, Number(vol)));
    if (this.audioEl) {
      this.audioEl.volume = this.musicVolume;
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(vol)));
  }

  setVoicesVolume(vol) {
    this.voicesVolume = Math.max(0, Math.min(1, Number(vol)));
  }

  playTone(freq, duration, type = 'triangle', volume = 0.2, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx || volume <= 0) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playSfx(kind) {
    if (!this.sfxEnabled) return;
    const vol = this.sfxVolume * 0.35;

    switch (kind) {
      case 'select':
        this.playTone(520, 0.08, 'sine', vol * 0.5);
        break;
      case 'move':
        this.playTone(180, 0.12, 'triangle', vol);
        this.playTone(120, 0.14, 'sine', vol * 0.8, 0.05);
        break;
      case 'capture':
        this.playTone(260, 0.1, 'sawtooth', vol * 0.8);
        this.playTone(95, 0.28, 'square', vol, 0.05);
        break;
      case 'check':
        this.playTone(440, 0.18, 'sawtooth', vol * 0.7);
        this.playTone(587.33, 0.25, 'sawtooth', vol * 0.8, 0.12);
        break;
      case 'victory':
        this.playTone(523.25, 0.18, 'triangle', vol, 0);
        this.playTone(659.25, 0.18, 'triangle', vol, 0.16);
        this.playTone(783.99, 0.35, 'triangle', vol, 0.32);
        break;
      case 'defeat':
        this.playTone(392.0, 0.22, 'sawtooth', vol * 0.6, 0);
        this.playTone(311.13, 0.25, 'sawtooth', vol * 0.6, 0.2);
        this.playTone(261.63, 0.45, 'sawtooth', vol * 0.7, 0.42);
        break;
      default:
        break;
    }
  }

  startMusicLoop() {
    const track = MUSIC_TRACKS.find((t) => t.id === this.selectedTrackId);
    if (track && track.url && typeof Audio !== 'undefined') {
      this.audioEl = new Audio(track.url);
      this.audioEl.loop = true;
      this.audioEl.volume = this.musicVolume;
      this.audioEl.play().catch(() => {
        // Se a faixa MP3 ainda não existir, usa o sintetizador leve
        this.startSynthLoop();
      });
      return;
    }
    this.startSynthLoop();
  }

  startSynthLoop() {
    if (this.musicTimer) return;
    const notes = [293.66, 349.23, 440.0, 392.0, 349.23, 329.63, 293.66, 220.0];
    this.musicTimer = setInterval(() => {
      if (!this.musicEnabled) return;
      const freq = notes[this.noteStep % notes.length];
      this.playTone(freq, 0.65, 'sine', this.musicVolume * 0.14);
      this.noteStep += 1;
    }, 750);
  }

  stopMusicLoop() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl = null;
    }
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
