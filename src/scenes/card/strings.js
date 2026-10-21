// Reception card UI strings — read as t('card.<key>'). The card's own words live in config.js → card.
export default {
  title: 'the reception card',
  envelope: 'an ivory envelope, sealed with wax',
  for: 'for',
  seal: 'break the wax seal',
  hintSeal: 'break the seal',
  hintDoors: 'open the doors',
  hintOpen: 'tap the card to look closer',
  hintZoom: 'drag to look around · tap to step back',
  doorLeft: 'open the left door',
  doorRight: 'open the right door',
  flip: 'back of the card',
  front: 'front of the card',
  save: 'save the card',
  saving: 'saving…',
  saved: 'saved ♥',
  saveFail: 'couldn’t save it — a screenshot works too',
  map: 'find the way',
  // tapping her name on the envelope: someone pencils a nickname over it, a new one each tap
  // (site two's jar order: Gulu, Puchu, Susu first; the -babus together; King last; then Bou)
  nicknames: [
    'Gulu',
    'Puchu',
    'Susu',
    'Vodai',
    'Ledu',
    'Sensitive',
    'Topper',
    'Lacchibabu',
    'Kacchibabu',
    'Rickshawbabu',
    'Noni',
    'Jhijhi',
    'Orangotang er bou',
    'Valo',
    'Khatash',
    'Gu-een',
    'King',
    'Bou ♥',
  ],
  // printed on the card, only when config's card.compliments is set (the card's own words —
  // labels included — live in config.js / config.bn.js → card, one language per card)
  face: {
    compliments: 'with best compliments from',
  },
}
