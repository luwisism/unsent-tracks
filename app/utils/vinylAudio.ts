export class VinylAmbienceEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;

  start() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      let sample = lastOut * 0.25;
      if (Math.random() < 0.0007) {
        sample += (Math.random() * 2 - 1) * 0.45;
      }
      data[i] = sample;
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.14;

    this.source.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.source.start();
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {}
      this.source = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
