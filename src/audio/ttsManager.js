/**
 * Gerenciador de síntese de voz (TTS) em PT-BR via Web Speech API.
 * Cada peça possui tom, velocidade e falas próprias no padrão ASD-STE100.
 */

const VOICE_PROFILES = {
  k: { name: 'Rei', pitch: 0.75, rate: 0.9 },
  q: { name: 'Rainha', pitch: 1.25, rate: 1.0 },
  r: { name: 'Torre', pitch: 0.65, rate: 0.85 },
  b: { name: 'Bispo', pitch: 0.95, rate: 0.95 },
  n: { name: 'Cavalo', pitch: 1.1, rate: 1.1 },
  p: { name: 'Peão', pitch: 1.15, rate: 1.05 },
};

const DIALOGUES = {
  select: {
    k: ['Ordene o próximo passo.', 'Proteja a coroa.'],
    q: ['Eu comando o tabuleiro.', 'Indique o alvo.'],
    r: ['Muralha pronta.', 'Firme como pedra.'],
    b: ['Vejo a diagonal.', 'O caminho está claro.'],
    n: ['Cavalo pronto para saltar.', 'Avante ao galope.'],
    p: ['Soldado em posição.', 'Eu avanço sem medo.'],
  },
  move: {
    k: ['O rei avança com cautela.', 'Mantenham a guarda.'],
    q: ['Ninguém bloqueia meu caminho.', 'Movimento preciso.'],
    r: ['Pedra em movimento.', 'Linha reta assegurada.'],
    b: ['Sigo pela diagonal.', 'Observo tudo.'],
    n: ['Salto em L concluído.', 'Velocidade total.'],
    p: ['Um passo à frente.', 'Cumprirei meu dever.'],
  },
  attack: {
    k: ['Pela honra do reino!', 'Alvo eliminado.'],
    q: ['Vitória absoluta.', 'Saia do meu caminho.'],
    r: ['Esmagado pela torre!', 'Impacto direto.'],
    b: ['Justiça executada.', 'A diagonal venceu.'],
    n: ['Ataque surpresa!', 'O cavalo golpeia!'],
    p: ['Captura confirmada!', 'Venci este duelo!'],
  },
  scared: {
    k: ['Estou em xeque! Protejam o rei!', 'Perigo iminente!'],
    q: ['Ameaça detectada.', 'Cuidado com o flanco.'],
    r: ['Impacto próximo.', 'Reforcem a defesa.'],
    b: ['Sinto perigo na linha.', 'Atenção máxima.'],
    n: ['Estou cercado!', 'Preciso recuar ou atacar.'],
    p: ['Socorro! Estou na mira!', 'Vou resistir!'],
  },
  victory: {
    k: ['Xeque-mate! O reino venceu!', 'Vitória gloriosa!'],
    q: ['Partida encerrada com honra.'],
  },
  defeat: {
    k: ['Fomos derrotados. Boa partida!', 'O rei caiu.'],
  },
};

export class TtsManager {
  constructor(soundManager, onSubtitle = null) {
    this.soundManager = soundManager;
    this.onSubtitle = onSubtitle;
    this.lastSpokenAt = 0;
  }

  pickLine(pieceType, event) {
    const group = DIALOGUES[event] || DIALOGUES.move;
    const lines = group[pieceType] || group.k || ['Movimento concluído.'];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  speak(pieceType, event) {
    const profile = VOICE_PROFILES[pieceType] || VOICE_PROFILES.p;
    const text = this.pickLine(pieceType, event);

    if (this.onSubtitle) {
      this.onSubtitle(`${profile.name}: "${text}"`);
    }

    if (!this.soundManager.voicesEnabled) return text;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return text;

    const now = Date.now();
    if (now - this.lastSpokenAt < 900 && event === 'select') {
      return text;
    }
    this.lastSpokenAt = now;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;
      utterance.volume = this.soundManager.voicesVolume;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback silencioso quando TTS do navegador está bloqueado
    }
    return text;
  }
}
