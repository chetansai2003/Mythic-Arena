let context;
export function muteAudio() {
  void context?.suspend().catch(() => {});
}
export function unlockAudio() {
  try {
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    void context.resume().catch(() => {});
  } catch {
    /* Audio is optional. */
  }
}
export function playCue(kind) {
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(
    kind === 'SUMMON' ? 440 : kind === 'FINISH' ? 660 : 220,
    start,
  );
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.025, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.2);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
