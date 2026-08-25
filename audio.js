const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;

export class LoopAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.music = null;
    this.effects = null;
    this.noiseBuffer = null;
    this.enabled = true;
    this.lastBeat = -1;
  }

  ensure() {
    if (!this.enabled || !AudioContextClass) return;
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.music = this.context.createGain();
    this.effects = this.context.createGain();
    this.master.gain.value = .64;
    this.music.gain.value = .34;
    this.effects.gain.value = .58;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.context.destination);

    const length = Math.floor(this.context.sampleRate * .24);
    this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.ensure();
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? .64 : 0, this.context.currentTime, .02);
    }
  }

  resetSequence() {
    this.lastBeat = -1;
  }

  tone(frequency, duration, gain = .08, type = 'sine', when = 0, destination = this.effects, endFrequency = null) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.context || !destination) return;
    const start = this.context.currentTime + when;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(.012, duration * .2));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .025);
  }

  noise(duration = .05, gain = .025, highpass = 4200, when = 0, destination = this.effects) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.context || !this.noiseBuffer || !destination) return;
    const start = this.context.currentTime + when;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    source.start(start);
    source.stop(start + duration + .02);
  }

  beat(beatIndex, echoCount, intensity = 0) {
    if (beatIndex === this.lastBeat || !this.enabled) return;
    this.lastBeat = beatIndex;
    this.ensure();
    if (!this.context) return;

    const beat = ((beatIndex % 14) + 14) % 14;
    const bassNotes = [55, 55, 65.41, 55, 73.42, 65.41, 49, 55, 55, 65.41, 82.41, 73.42, 65.41, 49];
    const melody = [220, 261.63, 293.66, 329.63, 293.66, 392, 329.63, 261.63];
    const energy = Math.min(1, Math.max(0, intensity));

    if (beat % 2 === 0) {
      this.tone(92 + energy * 12, .12, .09, 'sine', 0, this.music, 38);
      this.tone(48, .09, .045, 'triangle', 0, this.music, 32);
    }
    if (echoCount >= 1) {
      this.noise(.036, beat % 2 === 0 ? .022 : .032, 5200, 0, this.music);
    }
    if (echoCount >= 2 && beat % 2 === 0) {
      this.tone(bassNotes[beat], .24, .036 + energy * .012, 'triangle', .01, this.music);
    }
    if (echoCount >= 3 && beat % 2 === 1) {
      const note = melody[(beat >> 1) % melody.length];
      this.tone(note, .11, .025, 'square', .015, this.music);
      this.tone(note * 2, .07, .012, 'sine', .025, this.music);
    }
    if (echoCount >= 4) {
      this.noise(.022, .018, 6800, .125, this.music);
      if (beat % 4 === 0) this.tone(110, .36, .025, 'sawtooth', .02, this.music, 82.41);
    }
    if (echoCount >= 5 && beat % 7 === 0) {
      [329.63, 392, 493.88].forEach((frequency, index) => this.tone(frequency, .22, .017, 'sine', index * .035, this.music));
    }
  }

  sfx(name, accent = '#45f4ff') {
    if (!this.enabled) return;
    this.ensure();
    if (!this.context) return;
    const bright = accent === '#ffd166' || accent === '#ff4fd8';
    switch (name) {
      case 'start':
        [220, 330, 440].forEach((frequency, index) => this.tone(frequency, .13, .045, 'triangle', index * .055));
        break;
      case 'node':
        this.tone(bright ? 740 : 620, .12, .07, 'sine');
        this.tone(bright ? 1110 : 930, .18, .035, 'triangle', .035);
        break;
      case 'plate':
        this.tone(164.81, .12, .045, 'triangle');
        this.tone(329.63, .1, .025, 'sine', .025);
        break;
      case 'gate':
        this.tone(110, .18, .035, 'sawtooth', 0, this.effects, 220);
        this.noise(.08, .025, 1800);
        break;
      case 'rewind':
        this.tone(660, .32, .065, 'triangle', 0, this.effects, 110);
        this.tone(440, .28, .035, 'sine', .03, this.effects, 82);
        break;
      case 'retry':
        this.tone(160, .18, .045, 'triangle', 0, this.effects, 92);
        break;
      case 'fault':
        this.tone(132, .34, .09, 'sawtooth', 0, this.effects, 42);
        this.noise(.13, .045, 600);
        break;
      case 'complete':
        [261.63, 329.63, 392, 523.25].forEach((frequency, index) => this.tone(frequency, .28, .05, 'triangle', index * .075));
        break;
      case 'undo':
        this.tone(420, .16, .04, 'sine', 0, this.effects, 210);
        break;
      default:
        this.tone(440, .08, .035, 'sine');
    }
  }
}
