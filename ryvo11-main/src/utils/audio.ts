// Professional Web Audio API sound generator for Ryvo Store
// Bypasses static assets and generates crystal clear synth sounds on the fly

let isMutedGlobal = false;

export function setMuteState(muted: boolean) {
  isMutedGlobal = muted;
}

export function getMuteState(): boolean {
  return isMutedGlobal;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
}

export function playAddToCartSound() {
  if (isMutedGlobal) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(659.25, now); // E5
  osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.22);
  osc2.stop(now + 0.22);
}

export function playCheckoutSuccessSound() {
  if (isMutedGlobal) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  gain.connect(ctx.destination);

  // Play a beautiful triumphant chord: C4, E4, G4, C5
  const freqs = [261.63, 329.63, 392.00, 523.25];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + idx * 0.08);
    osc.frequency.exponentialRampToValueAtTime(f * 2, now + 0.3 + idx * 0.08);
    osc.connect(gain);
    osc.start(now + idx * 0.08);
    osc.stop(now + 0.7);
  });
}

export function playWheelSpinSound() {
  if (isMutedGlobal) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(60, now + 0.08);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

export function playWheelWinSound() {
  if (isMutedGlobal) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
  gain.connect(ctx.destination);

  // Play a cheerful high-pitched success sound
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + idx * 0.05);
    osc.connect(gain);
    osc.start(now + idx * 0.05);
    osc.stop(now + 0.5);
  });
}
