/*
 * Kitchen art — inline SVG strings. Colours come from CSS (tokens) via classes; the only
 * literal colours are the ingredient colours, which arrive from config as --c.
 *
 *   potSVG()     the pot (with a face), broth, swirl, bubbles, lid, spoon, steam, burner
 *   jarSVG(i)    one of three jar shapes (by index), contents tinted by --c
 *   plateSVG()   the dish: a plate with a heart-shaped helping (tinted by --broth)
 */

// pot geometry (viewBox 0 0 260 240); the broth surface is centred on BROTH
export const BROTH = { cx: 130, cy: 78, rx: 86, ry: 15 }

const BODY = 'M28 72 L30 150 Q32 204 84 208 L176 208 Q228 204 230 150 L232 72 Z'
const HEART = 'M130 -6 C 82 -40, 92 -96, 130 -70 C 168 -96, 178 -40, 130 -6 Z'

export function potSVG() {
  const { cx, cy, rx, ry } = BROTH
  return `
<svg class="pot" viewBox="0 0 260 240" aria-hidden="true">
  <defs>
    <radialGradient id="k-glow"><stop offset="0" class="glow-stop"/><stop offset="1" class="glow-stop glow-stop--out"/></radialGradient>
    <clipPath id="k-broth-clip"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
  </defs>

  <!-- steam: lazy wisps while cooking, then a heart -->
  <g class="pot__steam" data-steam>
    <path class="wisp wisp--1" d="M96 52 c-10 -14 10 -22 0 -36 s10 -22 0 -34"/>
    <path class="wisp wisp--2" d="M132 48 c-10 -14 10 -22 0 -36 s10 -22 0 -34"/>
    <path class="wisp wisp--3" d="M166 52 c-10 -14 10 -22 0 -36 s10 -22 0 -34"/>
    <path class="heart-fill" d="${HEART}"/>
    <path class="heart" d="${HEART}" pathLength="1"/>
  </g>

  <!-- burner: grate + flames -->
  <g class="pot__burner">
    <ellipse class="burner__glow" cx="130" cy="220" rx="130" ry="26"/>
    <g class="flames">
      ${[62, 88, 114, 146, 172, 198].map((x, i) => `<path class="flame flame--${i % 3}" d="M${x} 226 c-9 -6 -7 -16 0 -26 c7 10 9 20 0 26 z"/>`).join('')}
    </g>
    <path class="burner__grate" d="M40 222 H220 M58 214 v14 M202 214 v14"/>
  </g>

  <!-- handles -->
  <path class="pot__handle" d="M30 96 C 4 94, 4 128, 30 126"/>
  <path class="pot__handle" d="M230 96 C 256 94, 256 128, 230 126"/>

  <!-- body -->
  <g class="pot__bodywrap">
    <path class="pot__shadow" d="${BODY}" transform="translate(6 6)"/>
    <path class="pot__body" d="${BODY}"/>
    <path class="pot__band" d="M30 168 Q130 182 230 168"/>
    <g class="pot__dots">
      <circle cx="54" cy="186" r="5"/><circle cx="206" cy="186" r="5"/>
      <circle cx="44" cy="104" r="4"/><circle cx="216" cy="104" r="4"/>
    </g>
    <path class="pot__shine" d="M46 98 Q44 130 52 158"/>

    <!-- the face -->
    <g class="face">
      <ellipse class="face__blush" cx="78" cy="146" rx="13" ry="7"/>
      <ellipse class="face__blush" cx="182" cy="146" rx="13" ry="7"/>
      <g class="face__eyes face__eyes--open">
        <ellipse cx="98" cy="126" rx="7" ry="9.5"/><ellipse cx="162" cy="126" rx="7" ry="9.5"/>
        <circle class="face__glint" cx="100.5" cy="122" r="2.4"/><circle class="face__glint" cx="164.5" cy="122" r="2.4"/>
      </g>
      <g class="face__eyes face__eyes--happy">
        <path d="M89 129 Q98 116 107 129"/><path d="M153 129 Q162 116 171 129"/>
      </g>
      <g class="face__eyes face__eyes--squeeze">
        <path d="M90 120 L106 127 L90 134"/><path d="M170 120 L154 127 L170 134"/>
      </g>
      <path class="face__mouth face__mouth--smile" d="M116 146 Q130 160 144 146"/>
      <ellipse class="face__mouth face__mouth--o" cx="130" cy="152" rx="9" ry="11"/>
      <path class="face__mouth face__mouth--grin" d="M112 144 Q130 172 148 144 Z"/>
    </g>
  </g>

  <!-- rim + inside -->
  <ellipse class="pot__rim" cx="130" cy="72" rx="104" ry="24"/>
  <ellipse class="pot__inside" cx="130" cy="74" rx="94" ry="19"/>
  <ellipse class="pot__broth" data-broth cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
  <g clip-path="url(#k-broth-clip)">
    <g class="pot__swirl" data-swirl transform="translate(${cx} ${cy}) scale(1 ${(ry / rx).toFixed(3)})">
      <path d="M0 0 C 30 -10, 40 30, 0 40 C -50 50, -64 -20, -20 -52 C 30 -84, 92 -30, 70 30"/>
      <path d="M-70 -20 C -60 -60, -10 -80, 30 -70" />
    </g>
    <g class="pot__bubbles" data-bubbles></g>
    <g class="pot__ripples" data-ripples></g>
  </g>
  <path class="pot__lip" d="M26 72 A104 24 0 0 0 234 72"/>

  <!-- spoon (shown once everything is in); positioned by JS -->
  <g class="spoon" data-spoon>
    <g class="spoon__arm">
      <ellipse class="spoon__ring" cx="0" cy="2" rx="14" ry="4"/>
      <path class="spoon__shadow" d="M5 0 L 41 -108" />
      <path class="spoon__outline" d="M0 0 L 36 -110" />
      <path class="spoon__handle" d="M0 0 L 36 -110" />
      <circle class="spoon__hole" cx="34" cy="-102" r="3"/>
    </g>
  </g>

  <!-- splash droplets live here (above the rim) -->
  <g class="pot__splash" data-splash></g>

  <!-- the lid: arrives at the end, rattles, pops -->
  <g class="lid" data-lid>
    <path class="lid__dome" d="M24 72 Q130 6 236 72 Q130 98 24 72 Z"/>
    <path class="lid__shine" d="M70 52 Q100 38 128 36"/>
    <rect class="lid__knob" x="116" y="20" width="28" height="16" rx="7"/>
  </g>

  <!-- "stir me" arrow sweeping over the back of the pot (shown as a nudge) -->
  <g class="stir-hint">
    <path class="stir-hint__arc" d="M12 62 A118 44 0 0 1 248 62"/>
    <path class="stir-hint__head" d="M232 42 L248 64 L222 68"/>
  </g>

  <!-- stir progress, an ellipse hugging the rim -->
  <ellipse class="stir__track" cx="130" cy="72" rx="118" ry="32"/>
  <ellipse class="stir__fill" data-stir="0" cx="130" cy="72" rx="118" ry="32" pathLength="1" transform="rotate(180 130 72)"/>
</svg>`
}

// three jar silhouettes, viewBox 0 0 100 124
const JARS = [
  { // mason
    glass: 'M26 32 h48 v8 c0 6 16 10 16 26 v40 c0 8 -6 13 -13 13 H23 c-7 0 -13 -5 -13 -13 V66 c0 -16 16 -20 16 -26 z',
    lid: { x: 20, y: 14, w: 60, h: 20, r: 6 },
    top: 58,
  },
  { // round & squat
    glass: 'M32 46 h36 c16 4 24 18 24 34 c0 24 -18 38 -42 38 S8 104 8 80 c0 -16 8 -30 24 -34 z',
    lid: { x: 26, y: 30, w: 48, h: 18, r: 6 },
    top: 70,
  },
  { // tall
    glass: 'M32 22 h36 v6 c0 4 8 7 8 15 v64 c0 7 -5 12 -12 12 H36 c-7 0 -12 -5 -12 -12 V43 c0 -8 8 -11 8 -15 z',
    lid: { x: 28, y: 6, w: 44, h: 18, r: 5 },
    top: 46,
  },
]

export function jarSVG(i) {
  const j = JARS[i % JARS.length]
  const id = `k-jar-${i}`
  const lidTone = ['mustard', 'berry', 'sage', 'pink'][i % 4]
  return `
<svg class="jar__svg" viewBox="0 0 100 124" aria-hidden="true">
  <defs><clipPath id="${id}"><path d="${j.glass}"/></clipPath></defs>
  <path class="jar__shadow" d="${j.glass}" transform="translate(5 5)"/>
  <path class="jar__glass" d="${j.glass}"/>
  <g clip-path="url(#${id})">
    <path class="jar__fill" d="M0 ${j.top} q12 -7 25 0 t25 0 t25 0 t25 0 V130 H0 Z"/>
    <circle class="jar__fleck" cx="30" cy="${j.top + 22}" r="3"/>
    <circle class="jar__fleck" cx="62" cy="${j.top + 34}" r="2.4"/>
    <circle class="jar__fleck" cx="48" cy="${j.top + 14}" r="2"/>
  </g>
  <path class="jar__outline" d="${j.glass}"/>
  <path class="jar__shine" d="M${i % 3 === 1 ? '20 78 q2 -14 12 -22' : '22 74 q0 -14 10 -22'}"/>
  <rect class="jar__lid jar__lid--${lidTone}" x="${j.lid.x}" y="${j.lid.y}" width="${j.lid.w}" height="${j.lid.h}" rx="${j.lid.r}"/>
  <path class="jar__lidline" d="M${j.lid.x + 6} ${j.lid.y + j.lid.h / 2} h${j.lid.w - 12}"/>
</svg>`
}

export function plateSVG() {
  return `
<svg class="plate__svg" viewBox="0 0 220 120" aria-hidden="true">
  <ellipse class="plate__shadow" cx="116" cy="70" rx="104" ry="42"/>
  <ellipse class="plate__rim" cx="110" cy="64" rx="104" ry="42"/>
  <ellipse class="plate__well" cx="110" cy="64" rx="70" ry="26"/>
  <path class="plate__food" d="M110 82 C 76 64, 82 38, 110 50 C 138 38, 144 64, 110 82 Z"/>
  <path class="plate__shine" d="M86 48 q10 -6 18 -4"/>
  <g class="plate__herb"><path d="M120 48 q8 -10 16 -6 q-6 8 -16 6z"/><path d="M118 48 q-2 -10 6 -14"/></g>
</svg>`
}
