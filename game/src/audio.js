// Simmer & Serve — every sound is synthesized with WebAudio, no audio files.
// All calls are guarded: in a headless screenshot run there is no audio device
// and the game must never throw.
let ctx = null;
let muted = false;
let sizzleNodes = null;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopSizzle();
  return muted;
}

function audioContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

// One short tone. `type` is an oscillator shape, `slideTo` glides the pitch.
function tone(freq, duration, type, volume, slideTo) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Audio is decoration; a failure here must never break the game.
  }
}

// A burst of filtered noise, used for chops and sizzles.
function noiseBurst(duration, volume, filterFreq) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const len = Math.max(1, Math.floor(ac.sampleRate * duration));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
  } catch {
    // Ignore audio failures.
  }
}

export function soundPickup() {
  tone(520, 0.08, 'sine', 0.12, 760);
}

export function soundPlace() {
  tone(340, 0.09, 'triangle', 0.14, 260);
}

export function soundChop() {
  noiseBurst(0.09, 0.25, 1800);
  tone(180, 0.06, 'square', 0.06, 120);
}

export function soundDing() {
  tone(880, 0.18, 'sine', 0.16);
  setTimeout(() => tone(1320, 0.22, 'sine', 0.12), 90);
}

export function soundCoin() {
  tone(990, 0.07, 'square', 0.08);
  setTimeout(() => tone(1480, 0.16, 'square', 0.08), 70);
}

export function soundError() {
  tone(160, 0.16, 'sawtooth', 0.1, 110);
}

export function soundBurnt() {
  tone(220, 0.3, 'sawtooth', 0.1, 70);
  noiseBurst(0.25, 0.12, 500);
}

export function soundServe() {
  soundDing();
  setTimeout(soundCoin, 140);
}

export function soundNewOrder() {
  tone(660, 0.1, 'triangle', 0.12, 880);
}

// A looping crackle while anything is on the grill or in the fryer.
export function startSizzle() {
  if (muted || sizzleNodes) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const len = ac.sampleRate;
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ac.currentTime + 0.3);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
    sizzleNodes = { src, gain };
  } catch {
    sizzleNodes = null;
  }
}

export function stopSizzle() {
  if (!sizzleNodes) return;
  try {
    sizzleNodes.gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.15);
    const nodes = sizzleNodes;
    setTimeout(() => {
      try { nodes.src.stop(); } catch { /* already stopped */ }
    }, 200);
  } catch {
    // Ignore.
  }
  sizzleNodes = null;
}
