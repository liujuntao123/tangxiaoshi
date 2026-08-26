let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.05) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

export function sfxTap() {
  beep(520, 0.06, "triangle", 0.03);
}

export function sfxHit() {
  beep(340, 0.09, "square", 0.05);
  window.setTimeout(() => beep(620, 0.12, "sawtooth", 0.04), 40);
}

export function sfxHurt() {
  beep(180, 0.16, "square", 0.05);
}

export function sfxWin() {
  beep(520, 0.1, "triangle", 0.04);
  window.setTimeout(() => beep(780, 0.14, "triangle", 0.04), 90);
}
