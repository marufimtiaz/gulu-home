/*
 * The fence is a xylophone. The `xylo` sound plays bar i of C4 D4 E4 G4 A4 C5 D5 E5; picket k
 * plays the k-th note of the house theme's melody (A Thousand Years — sound/theme.js), an
 * octave down, each note moved to the nearest bar (F → E, B → C). So playing the pickets
 * left → right plays the song's opening: "heart beats fast, colours and promises…".
 */
import { VERSE } from '../../sound/theme.js'

export const XYLO = [60, 62, 64, 67, 69, 72, 74, 76]
export const nearestBar = (m) => XYLO.reduce((b, x, i) => (Math.abs(x - m) < Math.abs(XYLO[b] - m) ? i : b), 0)
export const TUNE = VERSE.filter((e) => e.n != null).map((e) => nearestBar(e.n - 12))
/** Pickets in a row, left → right, before the garden sings along. */
export const SONG_RUN = 8
