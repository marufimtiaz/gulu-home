/*
 * Sound API (the contract every scene uses). Implementation: sound/engine.js.
 *
 *   sound.play(name, opts?)      one-shot effect. Names: see EFFECTS below. Unknown → no-op.
 *   sound.layer(name)            start a looping ambient layer for the current scene; returns stop()
 *   sound.theme(part)            'verse' | 'chorus' | 'off' — the house music
 *   sound.mode() / cycleMode()   'all' (music+sfx) → 'sfx' → 'off'; remembered in state
 *   sound.unlock()               call from a user gesture (also done automatically on first tap)
 */
import * as engine from './engine.js'

export const EFFECTS = [
  'tap', 'pop', 'sparkle', 'whoosh', 'chime', 'success',          // generic
  'lockClick', 'creak', 'lampOn',                                  // door / chrome
  'tick',                                                          // living (opts.rate 0..1)
  'plop', 'splash', 'bubble', 'lidPop',                            // kitchen
  'seed', 'grow', 'pour',                                          // garden
  'ting',                                                          // rooftop (opts.i = note index)
  'chain', 'paper', 'scratch', 'stamp',                            // desk
  'roller', 'marker',                                              // empty room
  'hang', 'peel', 'firework',                                      // finale
  'knock', 'squish', 'drip', 'rustle', 'slosh', 'buzz', 'meow', 'xylo', 'spores', // scenery (ui/react.js)
]
export const LAYERS = ['clock', 'kettle', 'crickets', 'wind', 'pen', 'room']

export const sound = {
  play: (name, opts) => engine.play(name, opts),
  layer: (name) => engine.layer(name),
  theme: (part) => engine.theme(part),
  mode: () => engine.mode(),
  cycleMode: () => engine.cycleMode(),
  unlock: () => engine.unlock(),
}
export default sound
