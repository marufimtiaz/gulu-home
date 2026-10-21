// Door scene strings — read as t('door.<key>').
export default {
  who: "who's there?",
  welcome: "oh — it's you.",
  howto: 'the lock is a little clock. turn its hands.',
  try: 'try',
  lock: 'clock lock',
  time: '{h}:{m}',

  // ── things on the porch answer back (lists escalate; the last line repeats) ──
  // the voice behind the door, when she taps the speech bubble
  guesses: [
    'is it the delivery?',
    'Topper? back with results?',
    'Lacchibabu? Kacchibabu? Rickshawbabu?',
    'wait. I know that tap. {nickname}?',
    'come in then. the clock knows the way.',
  ],
  // …when she knocks on the door
  knocks: ['…was that a knock?', "who's THERE?", 'if it\'s {nickname}: you know what time it is.'],
  // …when she tries the door knob
  knob: ['locked.', 'still locked.', 'the knob is just for show. the clock is the lock.'],
  // …when she looks under the doormat
  mat: ['nope. no key under there.', 'still no key, Vodai.', 'the key is a time, not a thing.'],
  // …when she taps the porch lamp (the moths come out of the plant for it)
  lamp: 'not yet. the clock first.',
  // the blank nameplate gets pencilled on
  plate: ['reserved', 'for two ♥'],
  // she plucks a petal per tap. it always comes out right.
  petals: ['loves me…', 'loves me not…', 'loves me…', 'loves me not?!', 'recounting…', 'loves me. final answer.'],
  // knocking on the dark windows either side (wide screens)
  window: ['wrong window, Puchu.', 'the door is right there.', 'still the wrong window.'],
  // the cat in the gable vent
  cat: 'mrrp.',
}
