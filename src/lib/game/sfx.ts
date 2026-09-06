let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/**
 * 辅助构建低通滤波节点：
 * 滤除生硬数码高频，营造水墨古风温润质感。
 */
function createLowpass(ac: AudioContext, cutoff: number): BiquadFilterNode {
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  return filter;
}

/**
 * 木笏轻叩：triangle 波短促急衰减，模拟木质诗签/按键反馈。
 * 时长 ~0.045s，gain ≤ 0.03。
 */
export function sfxTap() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const dur = 0.045;
  const osc = ac.createOscillator();
  const filter = createLowpass(ac, 1200);
  const g = ac.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, now);

  g.gain.setValueAtTime(0.025, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);

  osc.start(now);
  osc.stop(now + dur);
}

/**
 * 答对·玉磬双音：纯正五度 sine 880→1318Hz 错落泛音，温润清越，余音衰减 ~0.25s。
 */
export function sfxHit() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const filter = createLowpass(ac, 2200);
  filter.connect(ac.destination);

  // 第一音：880Hz（A5），起拍
  const osc1 = ac.createOscillator();
  const g1 = ac.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  g1.gain.setValueAtTime(0.035, now);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc1.connect(g1);
  g1.connect(filter);
  osc1.start(now);
  osc1.stop(now + 0.22);

  // 第二音：1318Hz（E6），错开 40ms 泛音腾起
  const osc2 = ac.createOscillator();
  const g2 = ac.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1318, now + 0.04);
  g2.gain.setValueAtTime(0.0001, now);
  g2.gain.setValueAtTime(0.04, now + 0.04);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc2.connect(g2);
  g2.connect(filter);
  osc2.start(now + 0.04);
  osc2.stop(now + 0.25);
}

/**
 * 答错·墨散短叹：220→160Hz sine 低频滑落 0.18s，温和克制不刺耳。
 */
export function sfxHurt() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const dur = 0.18;
  const osc = ac.createOscillator();
  const filter = createLowpass(ac, 600);
  const g = ac.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(160, now + dur);

  g.gain.setValueAtTime(0.038, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);

  osc.start(now);
  osc.stop(now + dur);
}

/**
 * 通关·诗境齐鸣：sine 三连上行（660/880/1175Hz），间隔约 95ms，带悠长尾音。
 */
export function sfxWin() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const filter = createLowpass(ac, 2400);
  filter.connect(ac.destination);

  const notes = [
    { freq: 660, offset: 0, dur: 0.22, gain: 0.032 },
    { freq: 880, offset: 0.095, dur: 0.24, gain: 0.038 },
    { freq: 1175, offset: 0.19, dur: 0.35, gain: 0.045 },
  ];

  for (const note of notes) {
    const start = now + note.offset;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, start);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.setValueAtTime(note.gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);

    osc.connect(g);
    g.connect(filter);
    osc.start(start);
    osc.stop(start + note.dur);
  }
}

/**
 * 结算落印·沉闷顿章：110→45Hz sine 0.08s 顿章声，用于诗印盖印仪式。
 * gain ≤ 0.06。
 */
export function sfxStamp() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const dur = 0.08;
  const osc = ac.createOscillator();
  const filter = createLowpass(ac, 300);
  const g = ac.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + dur);

  g.gain.setValueAtTime(0.058, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);

  osc.start(now);
  osc.stop(now + dur);
}
