/*
 * Language layer (ported from site two, as an ES module).
 *
 *   t(key, vars)    UI string from strings.js / strings.bn.js
 *   c(path, vars)   content value from config.js, overlaid with config.bn.js in Bengali.
 *                   Strings (also inside arrays/objects) get {tokens} filled.
 *   num(n)          Bengali numerals in bn
 *   date(d, style)  'long' (20 April 2022) | 'short' (20 Apr 2022) | 'time' (4:30 AM)
 *   days()          whole days since togetherSince
 *
 * Bengali content mirrors config.js: objects merge key by key, lists of objects merge
 * item by item by position, lists of plain text are replaced. Missing → English.
 */
import config from './content/config.js'
import configBn from './content/config.bn.js'
import strings from './content/strings.js'
import stringsBn from './content/strings.bn.js'
import { get, update } from './state.js'

export const LANGS = ['en', 'bn']
const DIGITS = '০১২৩৪৫৬৭৮৯'
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function overlay(base, extra) {
  if (extra === undefined || extra === null) return base
  if (Array.isArray(base) && Array.isArray(extra)) {
    if (base.some((x) => x && typeof x === 'object')) return base.map((item, i) => (extra[i] ? overlay(item, extra[i]) : item))
    return extra
  }
  if (base && typeof base === 'object' && typeof extra === 'object' && !Array.isArray(base)) {
    const out = { ...base }
    for (const k of Object.keys(extra)) out[k] = k in base ? overlay(base[k], extra[k]) : extra[k]
    return out
  }
  return extra
}

let current = 'en'
let C = config
let S = strings

/** Picks the language: ?lang= → saved → config.defaultLang → 'en'. Call once at boot. */
export function init(search = typeof location !== 'undefined' ? location.search : '') {
  const fromUrl = new URLSearchParams(search).get('lang')
  const saved = get().lang
  let l = config.defaultLang || 'en'
  if (LANGS.includes(saved)) l = saved
  if (LANGS.includes(fromUrl)) l = fromUrl
  apply(l)
  return current
}

function apply(l) {
  current = l
  C = l === 'bn' ? overlay(config, configBn) : config
  S = l === 'bn' ? overlay(strings, stringsBn) : strings
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l
    document.body?.classList.toggle('lang-bn', l === 'bn')
    if (l === 'bn' && !document.getElementById('bn-fonts')) {
      const link = document.createElement('link')
      link.id = 'bn-fonts'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;700&family=Atma:wght@500;700&display=swap'
      document.head.append(link)
    }
  }
}

export const lang = () => current

/** Saves the choice and reloads into the same route (every scene renders once per language). */
export function setLang(l, { reload = true } = {}) {
  if (!LANGS.includes(l)) return
  update({ lang: l })
  if (reload) {
    const url = new URL(location.href)
    url.searchParams.delete('lang')
    location.replace(url.toString())
  } else apply(l)
}

export const num = (v) => (current === 'bn' ? String(v).replace(/\d/g, (d) => DIGITS[d]) : String(v))

export function parseDate(s) {
  if (s instanceof Date) return s
  if (!s) return null
  // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" in local time
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0))
}

export function date(d, style = 'long') {
  d = parseDate(d)
  if (!d) return ''
  if (style === 'time') {
    const h = d.getHours() % 12 || 12
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ampm = current === 'bn' ? (d.getHours() < 12 ? 'ভোর' : 'সন্ধ্যা') : d.getHours() < 12 ? 'AM' : 'PM'
    return current === 'bn' ? `${ampm} ${num(h)}:${num(mm)}` : `${h}:${mm} ${ampm}`
  }
  if (current === 'bn') return `${num(d.getDate())} ${MONTHS_BN[d.getMonth()]} ${num(d.getFullYear())}`
  const month = style === 'short' ? MONTHS_EN[d.getMonth()].slice(0, 3) : MONTHS_EN[d.getMonth()]
  return `${d.getDate()} ${month} ${d.getFullYear()}`
}

/** Whole days since togetherSince (live). */
export function days(now = new Date()) {
  const since = parseDate(config.togetherSince)
  return Math.max(0, Math.floor((now - since) / 86400000))
}

function tokens(extra) {
  return {
    nickname: C.nickname,
    partnerName: C.partnerName,
    myName: C.myName,
    days: days().toLocaleString('en-US'),
    weddingDate: date(config.weddingDate),
    sinceDate: date(config.togetherSince),
    ...extra,
  }
}

/** Replaces {name} tokens. Numbers in vars are converted to Bengali numerals in bn. */
export function fill(str, vars = {}) {
  if (typeof str !== 'string') return str
  const all = tokens(vars)
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in all ? num(all[k]) : m))
}

function deepFill(v, vars) {
  if (typeof v === 'string') return fill(v, vars)
  if (Array.isArray(v)) return v.map((x) => deepFill(x, vars))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepFill(x, vars)]))
  return v
}

/** UI string. Missing keys return the key itself (visible in dev, never crashes). */
export function t(key, vars) {
  const s = key.split('.').reduce((o, k) => o?.[k], S)
  if (s === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing string: ${key}`)
    return key
  }
  return deepFill(s, vars)
}

/** Content value by dot path, tokens filled. Raw dates etc. are returned as-is. */
export function c(path, vars) {
  const v = path.split('.').reduce((o, k) => o?.[k], C)
  return deepFill(v, vars)
}

/** Raw English config (for non-text values like dates, photo names, colours). */
export const raw = () => config
