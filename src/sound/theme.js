/*
 * The house theme: "A Thousand Years" (Christina Perri) as a slow music box, in C, 76 bpm.
 * (Decided by the owner; the site is private.)
 *
 * The song is in 3/4. Here one original crotchet = one quaver at 76 bpm, so each original
 * 3/4 bar is three quavers and the I–vi–V–IV changes every three beats. The tables still
 * add up to whole 4/4 bars (12 beats per chord cycle), so loops line up with the pad.
 *
 * Notes are written as 'C5:2' (pitch:quavers), '-:1' is a rest. One line per original bar.
 * VERSE plays on the hub; CHORUS is saved for the finale.
 */
import { bell, midiToHz, tone } from './synth.js'

export const BPM = 76
export const BEAT = 60 / BPM

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const toMidi = (name) => {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name)
  if (!m) throw new Error(`bad note ${name}`)
  return 12 * (Number(m[3]) + 1) + STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
/** 'E5:1 D5:.5 -:1' → [{ n, d }] with d in beats. */
export function parse(src) {
  return src
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [p, q] = tok.split(':')
      return { n: p === '-' ? null : toMidi(p), d: Number(q) / 2 }
    })
}

// ── verse: three passes of C Am G F (two original bars per chord) ──
export const VERSE = parse(`
  -:1 E5:1 F5:1      G5:3               ~ heart beats | fast
  E5:1 D5:1 C5:1     D5:1 E5:1 C5:1     ~ colours and | promises
  -:1 B4:1 C5:1      D5:1 B4:2          ~ how to | be brave
  C5:1 C5:1 D5:1     C5:1.5 A4:.5 B4:.5 C5:.5   ~ how can I | love when I'm a-
  E5:2 D5:1          C5:3               ~ fraid to | fall
  -:1 A5:1 G5:1      E5:3               ~ (music box)
  B4:1 D5:1 D5:1     E5:1 D5:1 B4:1     ~ but watching | you stand a-
  C5:3               -:1 C5:1 D5:1      ~ lone | all of
  E5:1 G5:2          E5:1 E5:1 D5:1     ~ my doubt | suddenly
  E5:1 D5:1 C5:1     D5:1 C5:2          ~ goes away | somehow
  B4:1 C5:1 D5:1     D5:3               ~ one step clo- | ser
  A4:1 C5:1 D5:1     C5:3               ~ (breath)
`.replace(/~[^\n]*/g, ''))

// ── chorus: two passes of C Am G F, a little higher ──
export const CHORUS = parse(`
  -:1 E5:1 F5:1      G5:2 G5:.5 A5:.5   ~ I have | died every
  G5:2 E5:.5 E5:.5   D5:1 C5:2          ~ day, waiting | for you
  D5:2 E5:1          D5:1 D5:1 E5:1     ~ darling | don't be a-
  C5:2 C5:.5 D5:.5   E5:1.5 D5:.5 C5:.5 D5:.5   ~ fraid, I have | loved you for a
  E5:1 A5:1 G5:1     G5:3               ~ thousand | years
  E5:1 E5:1 D5:1     C5:1 D5:1 E5:1     ~ I'll love you | for a thou-
  D5:1 C5:2          B4:1 D5:1 G5:1     ~ sand more | (music box)
  A5:1 G5:1 F5:1     C5:3               ~ (home)
`.replace(/~[^\n]*/g, ''))

// I–vi–V–IV, Canon-style close voicings around middle C (bass, triad)
export const CHORDS = {
  C: [48, [60, 64, 67]],
  Am: [45, [60, 64, 69]],
  G: [43, [59, 62, 67]],
  F: [41, [57, 60, 65]],
}
const cycle = (times) => Array.from({ length: times }, () => ['C', 'Am', 'G', 'F']).flat().map((c) => ({ chord: c, d: 3 }))
export const VERSE_PAD = cycle(3)
export const CHORUS_PAD = cycle(2)

export const PARTS = {
  verse: { lead: VERSE, pad: VERSE_PAD, octave: false },
  chorus: { lead: CHORUS, pad: CHORUS_PAD, octave: true },
}

const total = (list) => list.reduce((s, e) => s + e.d, 0)

/*
 * Plays a part in a loop on `bus` (an AudioNode). Returns { gain, stop(fade) }.
 * The player owns a gain node so the engine can crossfade parts.
 * opts.lookahead: seconds scheduled ahead (bigger for offline rendering).
 * opts.audible(): when false, notes are skipped but time keeps moving (sound mode isn't 'all').
 */
export function createPlayer(ctx, bus, partName, { lookahead = 1.2, fadeIn = 1.5, echo = null, audible = () => true } = {}) {
  const part = PARTS[partName]
  const gain = ctx.createGain()
  gain.connect(bus)
  // the echo send fades with the part too, so a crossfade leaves no full-volume tails
  const wet = ctx.createGain()
  if (echo) wet.connect(echo)
  const faders = [gain.gain, wet.gain]
  const t0 = ctx.currentTime + 0.05
  for (const p of faders) {
    p.setValueAtTime(fadeIn ? 0.0001 : 1, t0)
    if (fadeIn) p.linearRampToValueAtTime(1, t0 + fadeIn)
  }
  const out = { out: gain, echo: echo ? wet : null }
  const loopLen = total(part.lead) * BEAT
  const lanes = [
    { list: part.lead, i: 0, at: t0, play: (e, t) => playLead(e, t) },
    { list: part.pad, i: 0, at: t0, play: (e, t) => playPad(e, t) },
  ]
  const rel = (t) => t - ctx.currentTime - 0.01

  function playLead(e, t) {
    if (e.n == null) return
    const hz = midiToHz(e.n)
    const len = Math.max(1.4, e.d * BEAT * 2.2)
    bell(ctx, out, hz, rel(t), { dur: len, gain: 0.13, wet: 0.45 })
    if (part.octave) bell(ctx, out, hz * 2, rel(t) + 0.012, { dur: len * 0.7, gain: 0.045, wet: 0.6 })
  }
  function playPad(e, t) {
    const [bass, triad] = CHORDS[e.chord]
    const len = e.d * BEAT
    // slow swell that overlaps into the next chord
    triad.forEach((m) => tone(ctx, out, midiToHz(m), rel(t), { dur: len + 1.4, gain: 0.02, attack: 1.0, wet: 0.3 }))
    tone(ctx, out, midiToHz(bass), rel(t), { dur: len + 0.6, gain: 0.055, attack: 0.35, wet: 0.08 })
    tone(ctx, out, midiToHz(bass + 12), rel(t), { type: 'triangle', dur: len, gain: 0.008, attack: 0.6, wet: 0.15 })
    // a soft broken-chord on beats 2 and 3, music-box style
    tone(ctx, out, midiToHz(triad[1] + 12), rel(t + BEAT), { dur: 1.1, gain: 0.018, wet: 0.5 })
    tone(ctx, out, midiToHz(triad[2] + 12), rel(t + 2 * BEAT), { dur: 1.1, gain: 0.018, wet: 0.5 })
  }

  function tick() {
    const horizon = ctx.currentTime + lookahead
    for (const lane of lanes) {
      // fell behind (tab was suspended)? skip ahead instead of bursting
      if (lane.at < ctx.currentTime - 0.2) {
        const behind = Math.ceil((ctx.currentTime - lane.at) / loopLen) * loopLen
        lane.at += behind
      }
      while (lane.at < horizon) {
        const e = lane.list[lane.i]
        if (audible()) lane.play(e, Math.max(lane.at, ctx.currentTime + 0.01))
        lane.at += e.d * BEAT
        lane.i = (lane.i + 1) % lane.list.length
      }
    }
  }
  tick()
  const timer = setInterval(tick, 200)
  let stopped = false
  return {
    gain,
    loopLen,
    stop(fade = 1.5) {
      if (stopped) return
      stopped = true
      clearInterval(timer)
      const t = ctx.currentTime
      for (const p of faders) {
        p.cancelScheduledValues(t)
        p.setValueAtTime(p.value, t)
        p.linearRampToValueAtTime(0, t + fade)
      }
      setTimeout(() => {
        gain.disconnect()
        wet.disconnect()
      }, (fade + 4) * 1000)
    },
  }
}
