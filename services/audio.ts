type EffectType = 'click' | 'success' | 'type';

type AmbientNodes = {
  ctx: AudioContext;
  gain: GainNode;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  lfo: OscillatorNode;
};

export type AmbientController = {
  start: () => Promise<boolean>;
  stop: () => void;
  setVolume: (volume: number) => void;
};

let sharedContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!sharedContext) sharedContext = new AudioCtor();
  return sharedContext;
};

const resumeContext = async (ctx: AudioContext) => {
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scheduleTone = (
  ctx: AudioContext,
  {
    frequency,
    startTime,
    duration,
    volume,
    type = 'sine'
  }: {
    frequency: number;
    startTime: number;
    duration: number;
    volume: number;
    type?: OscillatorType;
  }
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playEffect = async (type: EffectType, volume = 0.25) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  await resumeContext(ctx);
  const now = ctx.currentTime;
  const safeVolume = clamp(volume, 0, 1);

  if (type === 'click') {
    scheduleTone(ctx, { frequency: 880, startTime: now, duration: 0.06, volume: safeVolume, type: 'triangle' });
    return;
  }

  if (type === 'type') {
    scheduleTone(ctx, { frequency: 740, startTime: now, duration: 0.03, volume: safeVolume * 0.6, type: 'triangle' });
    scheduleTone(ctx, { frequency: 980, startTime: now + 0.02, duration: 0.025, volume: safeVolume * 0.45, type: 'sine' });
    return;
  }

  scheduleTone(ctx, { frequency: 523.25, startTime: now, duration: 0.12, volume: safeVolume, type: 'sine' });
  scheduleTone(ctx, { frequency: 659.25, startTime: now + 0.1, duration: 0.16, volume: safeVolume * 0.95, type: 'triangle' });
  scheduleTone(ctx, { frequency: 784, startTime: now + 0.22, duration: 0.22, volume: safeVolume * 0.9, type: 'sine' });
};

type TypingOptions = {
  volume?: number;
  minIntervalMs?: number;
};

export const createTypingSoundHandler = (options: TypingOptions = {}) => {
  const { volume = 0.12, minIntervalMs = 45 } = options;
  let lastTime = 0;
  return (event: { key: string; repeat?: boolean }, enabled: boolean) => {
    if (!enabled) return;
    if (event.repeat) return;
    const key = event.key;
    const isPrintable = key.length === 1 || key === 'Backspace' || key === 'Enter' || key === 'Delete' || key === 'Tab';
    if (!isPrintable) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastTime < minIntervalMs) return;
    lastTime = now;
    playEffect('type', volume).catch(() => undefined);
  };
};

export const createAmbientController = (): AmbientController => {
  let nodes: AmbientNodes | null = null;
  let currentVolume = 0.35;

  const ensureNodes = () => {
    if (nodes) return nodes;
    const ctx = getAudioContext();
    if (!ctx) return null;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();

    osc1.type = 'sine';
    osc1.frequency.value = 110;
    osc2.type = 'sine';
    osc2.frequency.value = 220;
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;

    lfo.connect(lfoGain).connect(gain.gain);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    lfo.start();

    nodes = { ctx, gain, osc1, osc2, lfo };
    return nodes;
  };

  const setVolume = (volume: number) => {
    currentVolume = clamp(volume, 0, 1);
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
    nodes.gain.gain.linearRampToValueAtTime(currentVolume, now + 0.2);
  };

  const start = async () => {
    const ctx = getAudioContext();
    if (!ctx) return false;
    await resumeContext(ctx);
    const active = ensureNodes();
    if (!active) return false;
    setVolume(currentVolume);
    return true;
  };

  const stop = () => {
    if (!nodes) return;
    const { ctx, gain, osc1, osc2, lfo } = nodes;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    const stopAt = now + 0.35;
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    lfo.stop(stopAt);
    osc1.disconnect();
    osc2.disconnect();
    lfo.disconnect();
    gain.disconnect();
    nodes = null;
  };

  return { start, stop, setVolume };
};
