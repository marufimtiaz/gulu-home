// Placeholder engine — Wave 1 replaces this with the synthesized Web Audio engine.
// Keeps the same exports so scenes work silently until then.
import { get, update } from '../state.js'

const MODES = ['all', 'sfx', 'off']
export const play = () => {}
export const layer = () => () => {}
export const theme = () => {}
export const unlock = () => {}
export const mode = () => (MODES.includes(get().sound) ? get().sound : 'all')
export function cycleMode() {
  const next = MODES[(MODES.indexOf(mode()) + 1) % MODES.length]
  update({ sound: next })
  return next
}
