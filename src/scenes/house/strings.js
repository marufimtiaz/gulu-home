// House hub strings (t('house.<key>')). Room names are shared: t('rooms.<id>').
export default {
  label: 'our house — tap a window',
  lights: '{n} of {total} lights on',
  toFinale: 'the door is waiting for its nameplate',
  plate: 'hang the nameplate',
  home: 'home.',
  letter: 'something came for you',

  // ── scenery remarks (lists escalate one per tap; the last repeats) ──
  // knocking on the front door: the same voice as the door scene, now that she's in
  knock: ["who's there?", "oh — it's you.", 'come in. you live here now.'],
  // the cat walks off after too many pats (it comes back)
  catAway: 'too many pats. very Khatash of him.',
  catBack: 'forgiven. he does that.',
  // every few puffs from the chimney
  chimney: 'something smells like kacchi… Kacchibabu?',
  // the water tank, after a few sloshes
  tank: 'enough water for a thousand yearsss of tea.',
  // the fairy lights, every few taps (before the finale)
  fairy: 'practising for later.',
}
