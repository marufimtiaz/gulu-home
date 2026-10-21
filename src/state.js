/*
 * The only module that touches localStorage. Everything else reads/writes through here.
 * Falls back to in-memory state when storage is unavailable (private mode).
 */
export const ROOMS = ['living', 'kitchen', 'garden', 'rooftop', 'desk', 'empty']
const KEY = 'our-home'
const MAX_NOTES = 30
const MAX_NOTE_LEN = 140

const fresh = () => ({
  v: 1,
  doorSeen: false,
  done: { living: false, kitchen: false, garden: false, rooftop: false, desk: false, empty: false, finale: false },
  empty: { wall: null, notes: [] },
  order: [], // rooms in the order she lit them (the finale replays it)
  lang: null,
  sound: 'all',
})

let memory = null
const listeners = new Set()

// The door is per visit: `doorSeen` lives in sessionStorage, so every new visit (opening the
// link, a new tab, launching from the home screen) starts at the clock lock, while reloads
// inside a visit (switching language, refreshing a room) stay where she is.
const DOOR_KEY = 'our-home-door'
function sessionDoor() {
  try {
    return sessionStorage.getItem(DOOR_KEY) === '1'
  } catch {
    return false
  }
}
function saveSessionDoor(seen) {
  try {
    if (seen) sessionStorage.setItem(DOOR_KEY, '1')
    else sessionStorage.removeItem(DOOR_KEY)
  } catch {
    /* private mode: in memory only */
  }
}

function read() {
  if (memory) return memory
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(KEY))
  } catch {
    /* unavailable or corrupt → start fresh */
  }
  const base = fresh()
  if (saved && saved.v === 1) {
    memory = {
      ...base,
      ...saved,
      done: { ...base.done, ...saved.done },
      empty: { ...base.empty, ...saved.empty, notes: Array.isArray(saved.empty?.notes) ? saved.empty.notes : [] },
      order: Array.isArray(saved.order) ? saved.order : [],
    }
  } else {
    memory = base
  }
  memory.doorSeen = sessionDoor()
  return memory
}

function write(next) {
  memory = next
  saveSessionDoor(next.doorSeen)
  try {
    const { doorSeen, ...lasting } = next // the door is remembered per visit, not forever
    localStorage.setItem(KEY, JSON.stringify(lasting))
  } catch {
    /* keep in memory only */
  }
  for (const fn of listeners) fn(next)
}

/** Current state snapshot (treat as read-only). */
export const get = () => read()

/** Shallow-merge a patch, or pass fn(state) → patch. */
export function update(patch) {
  const s = read()
  const p = typeof patch === 'function' ? patch(s) : patch
  write({ ...s, ...p })
}

/** fn(state) on every change. Returns unsubscribe. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const isDone = (id) => !!read().done[id]

/** Marks a room (or 'finale') done. Returns true if it was newly completed. */
export function markDone(id) {
  if (!(id in read().done)) throw new Error(`unknown room: ${id}`)
  if (isDone(id)) return false
  update((s) => ({ done: { ...s.done, [id]: true }, order: ROOMS.includes(id) ? [...s.order, id] : s.order }))
  return true
}

/** The six rooms in the order she lit them; rooms done before order was recorded follow in house order. */
export function litOrder() {
  const o = read().order.filter((r) => ROOMS.includes(r) && isDone(r))
  return [...new Set([...o, ...ROOMS.filter(isDone)])]
}

/** Number of the six rooms completed (finale not counted). */
export const doneCount = () => ROOMS.filter(isDone).length

/** Empty room unlocks once the other five rooms are done. */
export const emptyUnlocked = () => ROOMS.filter((r) => r !== 'empty').every(isDone)

/** Finale unlocks once all six rooms are done. */
export const finaleUnlocked = () => doneCount() === ROOMS.length

/** First incomplete room in suggestion order (empty only once unlocked), or null. */
export function suggested() {
  for (const r of ROOMS) {
    if (isDone(r)) continue
    if (r === 'empty' && !emptyUnlocked()) continue
    return r
  }
  return null
}

export function setWall(color) {
  update((s) => ({ empty: { ...s.empty, wall: color } }))
}

/** Adds a note to the empty room's wall. Returns the stored note or null if rejected. */
export function addNote(text, who = 'her') {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_LEN)
  if (!clean) return null
  const s = read()
  if (s.empty.notes.length >= MAX_NOTES) return null
  const note = { text: clean, who, at: Date.now() }
  update({ empty: { ...s.empty, notes: [...s.empty.notes, note] } })
  return note
}

export function reset() {
  write(fresh())
}

/** Test-only: forget the cached copy so the next read hits storage again. */
export function _reload() {
  memory = null
}
