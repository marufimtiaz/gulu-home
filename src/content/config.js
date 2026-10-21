/*
 * ♥ EVERYTHING PERSONAL LIVES HERE ♥
 * Edit, save — the dev server reloads. Bengali lives in config.bn.js (same shape, same order).
 *
 * Tokens you can use in any text: {nickname} {partnerName} {myName} {days} {weddingDate} {sinceDate}
 * Photos: files in public/photos/ — refer to them by filename ("IMG_20220420_043028770.jpg").
 */
export default {
  partnerName: 'Sneha',
  nickname: 'Gulu',
  myName: 'Maruf',
  // defaultLang: 'bn',

  togetherSince: '2022-04-20T04:30', // the minute she texted back
  weddingDate: '2026-10-22',

  // ambient life on every page (0 switches one off)
  ambient: { fireflies: 7, music: true },

  // ── The front door ──
  door: {
    // the lock is a little clock: she sets the hands to this time
    answer: { hour: 4, minute: 30 },
    hints: [
      'the minute "us" started.',
      'very early. neither of us was asleep.',
      'half past four, {nickname}.',
    ],
  },

  // ── Living room: the clock ──
  living: {
    firstPhoto: 'IMG_20220420_043028770.jpg', // the screenshot of the text — shown on the phone
    firstText: 'I love you toooo',
    firstTextFrom: '{nickname}',
    // cards that pop while she rewinds past them (any order — sorted by date)
    events: [
      { date: '2026-10-22', line: 'tonight. the first night in our home.' },
      { date: '2026-08-07', line: 'the families sat down with tea and said yes.' },
      { date: '2025-12-09', line: 'the ordinary days. my favourite ones.' },
      { date: '2024-02-10', line: 'somewhere here we stopped counting arguments.' },
      { date: '2022-11-25', line: 'the first photo of us that wasn\'t blurry.' },
      { date: '2022-04-20T04:30', line: 'and here — four o\'s. I counted.' },
    ],
    counter: '{days} days. and tonight.',
  },

  // ── Kitchen: recipe for us ──
  kitchen: {
    ingredients: [
      { label: '2 cups lacchi', note: 'nobody has ever loved lacchi this much.', color: '#f6e7c8' },
      { label: '1 plate kacchi', note: 'full plate. no sharing. (fine, a little sharing.)', color: '#e2a65a' },
      { label: 'one rickshaw ride', note: 'the long way home, obviously.', color: '#7fb8a8' },
      { label: '"keep talking"', note: 'stir it in slowly. it lasts all night.', color: '#f3b6cf' },
      { label: 'a thousand yearsss', note: 'with at least three s\'s.', color: '#c9a8e9' },
      { label: 'one "yo yo"', note: 'for flavour.', color: '#f2b134' },
      { label: 'a pinch of Khatash', note: 'carefully. rare. (not that rare.)', color: '#c2254d' },
    ],
    dish: 'Us.',
    dishNote: 'serves 2. forever.',
  },

  // ── Garden: the birthday garden, grown ──
  garden: {
    tag: '{myName} & {partnerName}',
    sign: 'plant something?',
    future: 'what will it look like?',
    after: 'we\'ll get there. one year at a time.',
    anniversary: 'happy anniversary, {nickname}.',
  },

  // ── Rooftop: memories in the stars ──
  // shape: flowers | rickshaw | teacup | phone | ring | cake | heart | house
  rooftop: {
    memories: [
      {
        shape: 'phone',
        photo: 'IMG_20220420_043028770.jpg',
        date: '2022-04-20T04:30',
        title: '"I love you toooo"',
        text: 'Half past four in the morning, neither of us asleep, and one little text that turned every day after it into "us".',
      },
      {
        shape: 'teacup',
        photo: 'IMG_20230203_143541206.jpg',
        date: '2023-02-03',
        title: 'the ordinary days',
        text: 'Late-night texts, my jokes, your songs, my insults, your make-ups. The ordinary days with you are my favourite ones.',
      },
      {
        shape: 'rickshaw',
        photo: 'IMG_20241205_172833.jpg',
        date: '2024-12-05',
        title: 'the long way home',
        text: 'Every rickshaw ride with you takes the long way. I have never once complained.',
      },
      {
        shape: 'flowers',
        photo: 'IMG_20261006_154204.jpg',
        date: '2026-10-06',
        title: 'the flower bucket',
        text: 'The day I showed up with a bucket of flowers and you cried — right there, openly, not even trying to hide it.',
      },
      {
        shape: 'cake',
        photo: 'IMG_20250528_182748.jpg',
        date: '2025-05-28',
        title: 'the birthday garden',
        text: 'I planted you a little garden once. You woke up every flower in it.',
      },
      {
        shape: 'heart',
        photo: 'IMG_20260807_102715.jpg',
        date: '2026-08-07',
        title: 'the families said yes',
        text: 'Our parents sat down, had some coffee and tea, and formally decided what you and I had dreamt of for years. Very official. Very tense.',
      },
      {
        shape: 'ring',
        photo: 'IMG_20260728_201519.jpg',
        date: '2026-10-22',
        title: 'tonight',
        text: 'You, me, and a lifetime of me telling people "yes, I\'m married to HER."',
      },
    ],
    wish: 'make a wish',
    wishAfter: 'it\'s yours. I won\'t ask.',
  },

  // ── Desk: the letter ── (DRAFT — rewrite this in your own words)
  letter: {
    hello: 'My {nickname},',
    paragraphs: [
      'Welcome home. I know — it\'s small, and it\'s made of paper, and the lights only come on when you touch them. But it\'s the first thing I built that was meant for both of us.',
      'We\'ve been "us" for {days} days. You grew up with me, you put up with me, you believed in me on the days I didn\'t. Every room in this house is something you gave me first.',
      'Tonight you stop being my girlfriend and start being my wife, and I keep trying to think of what changes. I don\'t think much does. I\'ll still be annoying. You\'ll still be right. I\'ll still choose you.',
      'Every time. In every lifetime. Without ever thinking twice. My bou.',
    ],
    signOff: 'Yours, from today in every way,',
    ps: [
      'P.S. I love you.',
      'P.P.S. still do. it\'s been a few seconds.',
      'P.P.P.S. press it all you want — it never runs out.',
      'P.P.P.P.S. okay you can stop now.',
      'P.P.P.P.P.S. …or don\'t. I like the attention.',
      'P.S. ×∞ — I love you, {nickname}. That\'s the whole letter, really.',
    ],
  },

  // ── Empty room: ours to fill ──
  empty: {
    prompt: 'things we\'ll do',
    starters: [
      'learn to cook kacchi ourselves (you\'ll do it, I\'ll taste it)',
      'a trip with no plan at all',
      'grow old and keep being annoying about it',
    ],
    walls: ['#f6d78b', '#b9d8b4', '#f3b6cf', '#a9d6e5', '#fbf3e4'],
  },

  // ── The reception card (in the letterbox, after the finale) ──
  // The card is in ONE language — the site's (config.bn.js has the Bengali card, same keys).
  // Order on the card: Bismillah → alpana → title → names → salutation → body → details →
  // closing + the hosts (the groom's parents) at the bottom, as the senders.
  card: {
    // top line, in Arabic calligraphy, in both languages (set to null to remove)
    invocation: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    invocationLabel: 'Bismillahir Rahmanir Rahim', // read aloud by screen readers
    title: 'Bou-bhat',
    subtitle: 'Wedding Reception',
    groom: 'Maruf', // the big script names
    bride: 'Sneha',
    salutation: 'Dear Sir/Madam,',
    greeting: 'Assalamu Alaikum.',
    // **…** = bold (the two full names)
    body: 'By the grace of Almighty Allah, our son **Md. Maruf Imtiaz** has been married to **Jannatul Atika Rahman Sneha**, daughter of Md. Aminur Rahman & Mrs. Monju Manara Begum. On this joyous occasion, we cordially invite you and your family to the Bou-bhat reception, and request your prayers for the newlyweds.',
    dateLabel: 'Date',
    dayLabel: null, // English puts the weekday in the date
    timeLabel: 'Time',
    venueLabel: 'Venue',
    date: '2026-10-23',
    time: '1:00 PM',
    venue: 'Budhpara, Motihar, Rajshahi',
    closing: 'With best regards,',
    hosts: 'Md. Moniruzzaman & Most. Fenshi Banu',
    address: null, // optional second line under the venue
    mapUrl: null, // ← optional Google Maps link, shown on the back of the card
    compliments: null, // optional "with best compliments from" names — null hides the line
    note: null, // ← optional handwritten line under the card
  },

  // ── Finale: the nameplate ──
  finale: {
    plate: '{myName} & {partnerName}',
    est: 'est. {weddingDate}',
    sticker: 'Bou',
    stickerNote: 'new name unlocked. my favourite one yet.',
    title: 'welcome home.',
    line: 'Every light in this house is on because of you.',
    after: 'come see the tree every year.',
  },
}
