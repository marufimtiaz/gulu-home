// Placeholder scene — replaced in Wave 1/2. Keeps the contract so routing works end to end.
import './scene.css'

let off = []

export default {
  id: 'empty',
  mount(root, ctx) {
    root.innerHTML = `
      <div class="stub">
        <h1 class="display">empty</h1>
        <button class="btn" type="button" data-stub-complete>${'empty' === 'door' ? 'open' : 'complete'}</button>
      </div>`
    const btn = root.querySelector('[data-stub-complete]')
    const onClick = () => {
      if ('empty' === 'door') {
        ctx.state.update({ doorSeen: true })
        ctx.go('house')
      } else if ('empty' === 'house') {
        ctx.go(ctx.state.suggested() ?? 'finale')
      } else {
        ctx.complete()
        ctx.back()
      }
    }
    btn.addEventListener('click', onClick)
    off.push(() => btn.removeEventListener('click', onClick))
  },
  unmount() {
    off.forEach((fn) => fn())
    off = []
  },
}
