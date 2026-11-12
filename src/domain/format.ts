/** YYYY-MM-DD -> TT.MM.JJJJ */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** German number format with comma and unit, e.g. 97,5 kg */
export function formatNumber(value: number, unit = '', digits = 1): string {
  const s = value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return unit ? `${s} ${unit}` : s
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
export const weekdayName = (iso: string) => WEEKDAYS[new Date(iso + 'T12:00:00').getDay()]
