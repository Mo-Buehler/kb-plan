// Web Audio beeps. iOS only allows audio after a user gesture, so call unlockAudio() from a tap.
let ctx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // audio not available -> visual signal only
  }
}

export function beep(times = 3): void {
  if (!ctx) return
  try {
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.3
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.22)
    }
  } catch {
    // ignore
  }
}
