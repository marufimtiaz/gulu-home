import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const PHOTO_DIR = resolve(import.meta.dirname, 'public/photos')
const EXT = /\.(jpe?g|png|webp|avif|gif)$/i

// `import photos from 'virtual:photos'` → [{ file, w, h }] for every photo in public/photos,
// sorted by filename. Thumbnail sizes come from thumbs/sizes.json (scripts/make-thumbs.py).
function photosPlugin() {
  const id = 'virtual:photos'
  return {
    name: 'photos-manifest',
    resolveId: (s) => (s === id ? '\0' + id : null),
    load(s) {
      if (s !== '\0' + id) return null
      const sizesFile = resolve(PHOTO_DIR, 'thumbs/sizes.json')
      const sizes = existsSync(sizesFile) ? JSON.parse(readFileSync(sizesFile, 'utf8')) : {}
      const files = existsSync(PHOTO_DIR) ? readdirSync(PHOTO_DIR).filter((f) => EXT.test(f)).sort() : []
      const list = files.map((file) => ({ file, w: sizes[file]?.[0] ?? null, h: sizes[file]?.[1] ?? null }))
      return `export default ${JSON.stringify(list)}`
    },
    configureServer(server) {
      server.watcher.add(PHOTO_DIR)
      const reload = (p) => {
        if (!p.startsWith(PHOTO_DIR)) return
        const mod = server.moduleGraph.getModuleById('\0' + id)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
    },
  }
}

export default defineConfig({
  plugins: [photosPlugin()],
  server: { port: 4180, strictPort: true },
  test: {
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } } },
    include: ['tests/unit/**/*.test.js'],
  },
})
