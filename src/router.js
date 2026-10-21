/*
 * Hash router: #/door, #/house, #/living … One scene mounted at a time into #stage.
 *
 * Scene contract (src/scenes/<id>/index.js):
 *   export default { id, mount(root, ctx), unmount() }
 * mount may return a Promise. ctx is built by makeCtx() below.
 */
import { gsap } from 'gsap'
import * as state from './state.js'
import * as i18n from './i18n.js'
import * as photos from './photos.js'
import * as fx from './fx/index.js'
import { sound } from './sound/index.js'
import { reduced } from './ui/motion.js'

export const SCENES = ['door', 'house', ...state.ROOMS, 'finale', 'card']

const loaders = import.meta.glob('./scenes/*/index.js')
const load = async (id) => (await loaders[`./scenes/${id}/index.js`]()).default

let stage = null
let active = null // { id, scene, el, cleanups }
let navigating = Promise.resolve()

/** Where a request for `id` should actually go, plus an optional toast key. */
export function resolve(id) {
  const s = state.get()
  if (!SCENES.includes(id)) id = s.doorSeen ? 'house' : 'door'
  if (id !== 'door' && !s.doorSeen) return { id: 'door' }
  if (id === 'empty' && !state.emptyUnlocked()) return { id: 'house', toast: 'locked.empty' }
  if (id === 'finale' && !state.finaleUnlocked()) return { id: 'house', toast: 'locked.finale' }
  if (id === 'card' && !state.isDone('finale')) return { id: 'house', toast: 'locked.card' }
  return { id }
}

export const current = () => active?.id ?? null

/** Navigate to a scene id ('house', 'kitchen', …). */
export function go(id) {
  if (location.hash !== `#/${id}`) location.hash = `#/${id}`
  else show(id)
}

function routeFromHash() {
  return location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] || ''
}

function makeCtx(id, el, cleanups, from) {
  return {
    id,
    from,
    root: el,
    t: i18n.t,
    c: i18n.c,
    raw: i18n.raw,
    lang: i18n.lang,
    num: i18n.num,
    date: i18n.date,
    days: i18n.days,
    fill: i18n.fill,
    state,
    sound,
    fx,
    photos,
    reduced: reduced(),
    params: new URLSearchParams(location.search),
    go,
    back: () => go('house'),
    /** Marks this room done (idempotent). Toasts + chimes the first time. Returns true if new. */
    complete(roomId = id) {
      const fresh = state.markDone(roomId)
      if (roomId === id) el.dataset.done = 'true'
      if (fresh && roomId !== 'finale') {
        fx.toast(i18n.t('reward.lit'))
        sound.play('success')
      }
      return fresh
    },
    /** Register cleanup (listeners, timelines, loops) — run after unmount(). */
    onCleanup: (fn) => cleanups.push(fn),
  }
}

async function show(requested) {
  const { id, toast } = resolve(requested)
  if (id !== requested) {
    if (toast) fx.toast(i18n.t(toast))
    history.replaceState(null, '', `${location.pathname}${location.search}#/${id}`)
  }
  if (active?.id === id) return

  const scene = await load(id)
  const el = document.createElement('section')
  el.className = `scene scene--${id}`
  el.dataset.scene = id
  const cleanups = []
  const prev = active
  active = { id, scene, el, cleanups }
  document.body.dataset.scene = id

  stage.append(el)
  try {
    await scene.mount(el, makeCtx(id, el, cleanups, prev?.id ?? null))
  } catch (err) {
    console.error(`[router] mount failed: ${id}`, err)
  }

  if (prev) {
    prev.el.classList.add('scene--leaving')
    const dur = reduced() ? 0.25 : 0.6
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'power1.out' })
    await gsap.to(prev.el, { opacity: 0, duration: dur, ease: 'power1.in' })
    try {
      prev.scene.unmount?.()
    } catch (err) {
      console.error(`[router] unmount failed: ${prev.id}`, err)
    }
    prev.cleanups.forEach((fn) => fn())
    prev.el.remove()
  }
  window.dispatchEvent(new CustomEvent('scenechange', { detail: { id } }))
}

export function start(stageEl) {
  stage = stageEl
  const onHash = () => {
    navigating = navigating.then(() => show(routeFromHash()))
  }
  window.addEventListener('hashchange', onHash)
  onHash()
  return () => window.removeEventListener('hashchange', onHash)
}
