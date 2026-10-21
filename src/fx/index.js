/*
 * Effects API (the contract scenes use). Each lives in its own file in src/fx/.
 *
 *   toast(text, { ms })                                   paper note, bottom centre
 *   fireflies(container, { count, gather }) → stop()      drifting fireflies; gather near the pointer
 *   starfield(container, { count, shooting }) → stop()    twinkling star sky filling container
 *   fireworks(container, { duration, signal }) → Promise & { stop() }   bursts over container (from bday);
 *                                                         stop() / signal ends it early, canvas removed
 *   sparkles(x, y, { count, colors })                     burst at a client point (fx layer)
 *   hearts(x, y, { count })                               little hearts float up from a point
 *   confetti({ duration })                                full-screen paper confetti
 *
 * All honour prefers-reduced-motion (static or skipped) and pause in background tabs.
 */
import './fx.css'

export { toast } from './toast.js'
export { fireflies } from './fireflies.js'
export { starfield } from './stars.js'
export { fireworks } from './fireworks.js'
export { sparkles, hearts } from './bursts.js'
export { confetti } from './confetti.js'
