// A tiny, entirely local sound desk. No autoplay, samples, tracking, or network calls.
let context;
let enabled = false;
export function setSound(value) {
  enabled = Boolean(value);
  if (enabled) {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    try { if (Audio) context ||= new Audio(); context?.resume().catch(() => {}); } catch { /* Sound is optional. */ }
  }
}
function note(frequency, delay, duration, type = 'sine', volume = 0.05, endFrequency) {
  if (!enabled || !context || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start); oscillator.stop(start + duration + 0.02);
}
export function playSound(name) {
  if (name === 'stamp') { note(110, 0, .13, 'triangle', .17, 35); note(620, .035, .08, 'square', .025, 180); }
  if (name === 'paper') { note(720, 0, .05, 'triangle', .035, 220); note(880, .04, .06, 'triangle', .025, 330); }
  if (name === 'help') { note(330, 0, .2, 'triangle', .07); note(247, .12, .3, 'triangle', .07); }
  if (name === 'promotion') [392, 494, 587, 784].forEach((f, i) => note(f, i * .13, .45, 'triangle', .07));
  if (name === 'laugh') [140, 130, 180, 160, 210, 170].forEach((f, i) => { note(f, i * .17, .13, 'sawtooth', .035, f * .7); note(f * 2, i * .17, .13, 'triangle', .025); });
  if (name === 'click') note(440, 0, .07, 'sine', .04, 660);
}
