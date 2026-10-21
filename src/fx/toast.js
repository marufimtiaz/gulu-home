/** toast(text, { ms }) — a small paper note at the bottom of the screen. */
export function toast(text, { ms = 2600 } = {}) {
  const host = document.getElementById('toasts')
  if (!host) return
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = text
  host.append(el)
  setTimeout(() => {
    el.classList.add('toast--out')
    el.addEventListener('animationend', () => el.remove(), { once: true })
    setTimeout(() => el.remove(), 800)
  }, ms)
}
