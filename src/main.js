import './styles/tokens.css'
import './styles/base.css'
import './styles/chrome.css'
import * as state from './state.js'
import * as i18n from './i18n.js'
import { sound } from './sound/index.js'
import * as router from './router.js'

// URL switches (handy while editing): ?reset · ?skip (straight to the house) · ?door (replay the door)
const params = new URLSearchParams(location.search)
if (params.has('reset')) state.reset()
if (params.has('skip')) state.update({ doorSeen: true })
if (params.has('door')) state.update({ doorSeen: false })

i18n.init()
document.title = i18n.t('title')

// ── corner chrome ──
const chrome = document.getElementById('chrome')
chrome.innerHTML = `
  <button class="chip chip--home" type="button" hidden></button>
  <button class="chip chip--lang" type="button" hidden></button>
  <button class="chip chip--sound" type="button" hidden></button>
`
const home = chrome.querySelector('.chip--home')
const langBtn = chrome.querySelector('.chip--lang')
const soundBtn = chrome.querySelector('.chip--sound')

home.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`
home.setAttribute('aria-label', i18n.t('chrome.home'))
home.addEventListener('click', () => router.go('house'))

langBtn.textContent = i18n.t('chrome.langTo')
langBtn.setAttribute('aria-label', i18n.t('chrome.langLabel'))
langBtn.addEventListener('click', () => i18n.setLang(i18n.lang() === 'bn' ? 'en' : 'bn'))

const ICON = { all: '🎶', sfx: '🔊', off: '🔇' }
const paintSound = () => {
  const m = sound.mode()
  soundBtn.textContent = ICON[m]
  soundBtn.setAttribute('aria-label', i18n.t(`chrome.sound.${m}`))
}
paintSound()
soundBtn.addEventListener('click', () => {
  sound.cycleMode()
  paintSound()
})

window.addEventListener('scenechange', (e) => {
  const id = e.detail.id
  home.hidden = id === 'door' || id === 'house'
  langBtn.hidden = false
  soundBtn.hidden = id === 'door' && !state.get().doorSeen
})

// ── debug hooks for tests and editing: ?debug ──
if (params.has('debug') || import.meta.env.DEV) {
  window.__home = {
    state,
    go: router.go,
    current: router.current,
    complete: (id) => state.markDone(id),
    completeAll: () => state.ROOMS.forEach((r) => state.markDone(r)),
  }
}

router.start(document.getElementById('stage'))
