/*
 * Interface text (English). Shared strings live here; each scene keeps its own in
 * src/scenes/<id>/strings.js, collected automatically under the scene id
 * (so t('kitchen.stir') reads src/scenes/kitchen/strings.js → { stir: '…' }).
 */
const scenes = import.meta.glob('../scenes/*/strings.js', { eager: true, import: 'default' })

const shared = {
  title: 'for {nickname} ♥',
  chrome: {
    home: 'back to our house',
    langLabel: 'বাংলা / English',
    langTo: 'বাংলা',
    sound: { all: 'music and sounds on', sfx: 'sounds only', off: 'muted' },
  },
  reward: {
    lit: 'a light came on ♥',
    back: 'back to the house',
  },
  locked: {
    empty: 'not yet — light the others first',
    finale: 'not yet — the house isn\'t lit',
  },
  rooms: {
    living: 'the living room',
    kitchen: 'the kitchen',
    garden: 'the garden',
    rooftop: 'the rooftop',
    desk: 'the desk',
    empty: 'the empty room',
  },
}

export function collect(globbed) {
  const out = {}
  for (const [path, value] of Object.entries(globbed)) {
    const id = path.match(/scenes\/([^/]+)\//)[1]
    out[id] = value
  }
  return out
}

export default { ...shared, ...collect(scenes) }
