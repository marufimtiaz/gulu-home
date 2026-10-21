/* Interface text (Bengali). Same shape as strings.js; missing keys fall back to English.
   Scene strings come from src/scenes/<id>/strings.bn.js automatically. */
import { collect } from './strings.js'

const scenes = import.meta.glob('../scenes/*/strings.bn.js', { eager: true, import: 'default' })

const shared = {
  title: '{nickname}র জন্য ♥',
  chrome: {
    home: 'আমাদের বাড়িতে ফিরে যাও',
    langTo: 'English',
    sound: { all: 'গান আর শব্দ চালু', sfx: 'শুধু শব্দ', off: 'চুপ' },
  },
  reward: {
    lit: 'একটা আলো জ্বলে উঠল ♥',
    back: 'বাড়িতে ফিরে চলো',
  },
  locked: {
    empty: 'এখনো না — আগে বাকি আলোগুলো জ্বালাও',
    finale: 'এখনো না — বাড়ির সব আলো জ্বলেনি',
    card: 'এটা একদম শেষে ♥',
  },
  rooms: {
    living: 'বসার ঘর',
    kitchen: 'রান্নাঘর',
    garden: 'বাগান',
    rooftop: 'ছাদ',
    desk: 'পড়ার টেবিল',
    empty: 'খালি ঘরটা',
  },
}

export default { ...shared, ...collect(scenes) }
