// Builds src/data/plan-seed.json from trainingsplan.md.
// Usage: node scripts/build-seed.mjs [path/to/trainingsplan.md]
// Personal master data (section 1) is deliberately NOT copied into the seed.
// Any cell that cannot be parsed makes the script fail loudly (no silent assumptions).
import fs from 'node:fs'
import crypto from 'node:crypto'

const srcPath = process.argv[2] ?? 'trainingsplan.md'
const text = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n')
const lines = text.split('\n')

// ---------- generic helpers ----------
const fail = (msg) => {
  throw new Error(msg)
}
const num = (s) => Number(String(s).replace(',', '.'))
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const isoFromDmy = (d, m, y) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const dmyToIso = (s) => {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  return m ? isoFromDmy(m[1], m[2], m[3]) : null
}
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function section(headingRe, level = '## ') {
  const start = lines.findIndex((l) => l.startsWith(level) && headingRe.test(l))
  if (start < 0) fail(`Section not found: ${headingRe}`)
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ') || (level === '### ' && lines[i].startsWith('### '))) {
      end = i
      break
    }
  }
  return lines.slice(start + 1, end)
}

function tablesIn(sectionLines) {
  const result = []
  let cur = null
  for (const l of sectionLines) {
    if (l.trim().startsWith('|')) {
      const cells = l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      if (cells.every((c) => /^-+$/.test(c))) continue
      if (!cur) {
        cur = { header: cells, rows: [] }
        result.push(cur)
      } else cur.rows.push(cells)
    } else cur = null
  }
  return result
}

const paragraphs = (sectionLines) =>
  sectionLines.map((l) => l.trim()).filter((l) => l && !l.startsWith('|') && !l.startsWith('#'))

// ---------- amounts ("Sätze × Wdh. @ Gewicht") ----------
function parseWeights(s) {
  const m = s.match(/^(?:(\d+) × (\d+)|(\d+) \+ (\d+)|(\d+)) kg(?:, (.+))?$/)
  if (!m) fail(`Cannot parse weight: "${s}"`)
  let weights
  if (m[1]) weights = Array(Number(m[1])).fill(Number(m[2]))
  else if (m[3]) weights = [Number(m[3]), Number(m[4])]
  else weights = [Number(m[5])]
  return { weights, note: m[6] }
}

function parseAmount(raw, exName) {
  let m
  if ((m = raw.match(/^wie W(\d+)(?:, (.+))?$/))) return { raw, sameAsWeek: Number(m[1]), note: m[2] }
  if ((m = raw.match(/^Test: (\d+) Swings @ (\d+) kg auf Zeit$/)))
    return { raw, kind: 'test', reps: Number(m[1]), timed: true, weights: [Number(m[2])] }
  const [left, right, extra] = raw.split(' @ ')
  if (extra !== undefined) fail(`Too many "@" in "${raw}"`)
  const out = { raw }
  if ((m = left.match(/^(\d+(?:-\d+)+)$/))) {
    out.kind = 'ladder'
    out.ladder = left.split('-').map(Number)
  } else if ((m = left.match(/^(\d+) Runden$/))) {
    out.kind = 'rounds'
    out.sets = Number(m[1])
  } else if ((m = left.match(/^(\d+) min × (\d+)$/))) {
    out.kind = 'emom'
    out.minutes = Number(m[1])
    out.reps = Number(m[2])
  } else if ((m = left.match(/^(\d+) × (\d+|max−2)( s)?(\/S)?(?: (.+))?$/))) {
    out.kind = /EMOM/.test(exName) ? 'emom' : 'sets'
    if (out.kind === 'emom') {
      out.minutes = Number(m[1])
      out.reps = Number(m[2])
    } else {
      out.sets = Number(m[1])
      if (m[2] === 'max−2') out.repsMode = 'max-2'
      else if (m[3]) out.seconds = Number(m[2])
      else out.reps = Number(m[2])
      if (m[4]) out.perSide = true
      if (m[5]) out.label = m[5]
    }
  } else fail(`Cannot parse amount: "${raw}" (${exName})`)
  if (right) {
    const w = parseWeights(right)
    out.weights = w.weights
    if (w.note) out.note = w.note
  }
  return out
}

// ---------- library (section 9) ----------
const library = []
{
  const t = tablesIn(section(/^## 9\./))[0]
  for (const r of t.rows)
    library.push({ id: slug(r[0]), name: r[0], start: r[1], end: r[2], hints: [r[3], r[4]] })
}
const libByName = Object.fromEntries(library.map((l) => [l.name, l.id]))
const libRules = [
  [/Einbeiniges KB-Kreuzheben/, 'Einbeiniges KB-Kreuzheben'],
  [/Kreuzheben/, 'KB-Kreuzheben (auch Doppel)'],
  [/Hike Pass|Swing/, 'Swing / Hike Pass'],
  [/Clean/, 'Clean'],
  [/Goblet Squat/, 'Goblet Squat (auf Box)'],
  [/Front-Squat/, 'Doppel-Front-Squat'],
  [/Split Squat|Reverse Lunge/, 'Split Squat / Reverse Lunge'],
  [/Farmer|Suitcase/, 'Farmer / Suitcase Carry'],
  [/Rudern/, 'Einarmiges Rudern (auch Doppel, Ausfallschritt)'],
  [/Floor Press|Floor-Press/, 'Floor Press (auch Doppel)'],
  [/Drücken über Kopf/, 'Drücken über Kopf (halbkniend/stehend)'],
  [/Liegestütz/, 'Liegestütz'],
  [/Dead Bug/, 'Dead Bug'],
  [/Seitstütz/, 'Seitstütz'],
  [/Hammer Curl/, 'Hammer Curl'],
  [/Horn Curl/, 'Horn Curl'],
  [/Trizepsdrücken/, 'Trizepsdrücken über Kopf'],
  [/Trizepsstrecken/, 'Trizepsstrecken liegend'],
]
const unmatched = []
function libraryIdFor(name) {
  for (const [re, libName] of libRules)
    if (re.test(name)) {
      const id = libByName[libName]
      if (!id) fail(`Library entry missing: ${libName}`)
      return id
    }
  unmatched.push(name)
  return null
}

// ---------- phases (section 3) ----------
const phases = []
{
  const t = tablesIn(section(/^## 3\./))[0]
  for (const r of t.rows) {
    const [a, b] = r[2].split('–').map(Number)
    const [d1, d2] = r[3].split('–')
    phases.push({
      id: r[0],
      name: r[1],
      weekFrom: a,
      weekTo: b,
      start: dmyToIso(d1),
      end: dmyToIso(d2),
      kbFocus: r[4],
      bikeFocus: r[5],
    })
  }
}
// Deload weeks are stated in prose in section 3 ("Deload-Wochen (...): Woche 4, 8, 12, 16.")
const deloadWeeks = (() => {
  const line = section(/^## 3\./).find((l) => /^Deload-Wochen/.test(l))
  if (!line) fail('Deload sentence not found in section 3')
  return [...line.split(':').slice(1).join(':').matchAll(/\d+/g)].map((m) => Number(m[0]))
})()
const phaseOfWeek = (w) => phases.find((p) => w >= p.weekFrom && w <= p.weekTo)?.id ?? null

// ---------- calendar (section 4) ----------
const PLAN_START = '2026-12-07'
const weekStart = (w) => addDays(PLAN_START, 7 * (w - 1))
const DOW = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so']

function classify(raw) {
  let s = raw
  const out = { label: raw }
  const paren = s.match(/\s*\((statt [^)]+)\)$/)
  if (paren) {
    out.note = paren[1]
    s = s.replace(paren[0], '')
  }
  let m
  if ((m = s.match(/^Fußball oder Workout C(?: \((\d+) min\))?$/))) {
    out.kind = 'football'
    out.alternative = 'workout-c'
    if (m[1]) out.amrapMinutes = Number(m[1])
  } else if (s === 'Fußball') out.kind = 'football'
  else if (s === 'Knie') out.kind = 'knee'
  else if (s === 'Ruhe') out.kind = 'rest'
  else if ((m = s.match(/^KB ([AB])( Deload)?(?: \(P(\d)\))?(?:, (.+))?$/))) {
    out.kind = m[1] === 'A' ? 'kb-a' : 'kb-b'
    if (m[2]) out.deload = true
    if (m[3]) out.phaseStart = `P${m[3]}`
    if (m[4]) out.note = m[4]
  } else if ((m = s.match(/^(MB-\S+(?: V\d)?)(?: oder (.+))?$/))) {
    out.kind = 'bike'
    out.workout = m[1]
    if (m[2]) out.alternativeText = m[2]
  } else if (/^FTP-Test/.test(s)) out.kind = 'ftp-test'
  else if (s === 'Ausgangsmessung') out.kind = 'measurement'
  else if (s === 'Sattel und Cleats messen') out.kind = 'task'
  else if ((m = s.match(/^Hinge-Drill(?: (\d+) × (\d+))?(?:, (.+))?$/))) {
    out.kind = 'hinge-drill'
    if (m[1]) {
      out.sets = Number(m[1])
      out.reps = Number(m[2])
    }
    if (m[3]) out.note = m[3]
  } else if ((m = s.match(/^Swing-Test \((\d+) × (\d+) kg\), (.+)$/))) {
    out.kind = 'swing-test'
    out.reps = Number(m[1])
    out.weights = [Number(m[2])]
    out.note = m[3]
  } else if (/^Rennrad draußen/.test(s)) out.kind = 'outdoor-ride'
  else fail(`Unknown calendar cell: "${raw}"`)
  return out
}

const weeks = []
{
  const t = tablesIn(section(/^## 4\./))[0]
  for (const r of t.rows) {
    const w = parseInt(r[0], 10)
    const start = w === 0 ? '2026-11-30' : weekStart(w)
    const [dmStart] = r[1].split('–')
    const [dd, mm] = dmStart.split('.')
    if (start.slice(5) !== `${mm}-${dd}`) fail(`Week ${w}: period "${r[1]}" does not match computed start ${start}`)
    const days = r.slice(2, 9).map((cell, i) => ({
      date: addDays(start, i),
      dow: DOW[i],
      session: classify(cell),
    }))
    weeks.push({
      week: w,
      start,
      end: addDays(start, 6),
      phase: phaseOfWeek(w),
      deload: deloadWeeks.includes(w),
      test: /Test/.test(r[0]),
      days,
    })
  }
}

// ---------- kettlebell workouts (section 6) ----------
const phaseSections = section(/^## 6\./)
const kbPhases = {}
{
  const subs = []
  let cur = null
  for (const l of phaseSections) {
    if (l.startsWith('### ')) {
      cur = { title: l.slice(4), lines: [] }
      subs.push(cur)
    } else if (cur) cur.lines.push(l)
  }
  for (const sub of subs) {
    const pm = sub.title.match(/^Phase (\d)/)
    if (!pm) continue
    const pid = `P${pm[1]}`
    const t = tablesIn(sub.lines)[0]
    const weekNums = t.header.slice(2).map((h) => Number(h.match(/^W(\d+)/)[1]))
    const byWorkout = { A: [], B: [] }
    for (const r of t.rows) {
      const idm = r[0].match(/^([AB])(\d)$/)
      if (!idm) fail(`Bad exercise id ${r[0]}`)
      const finisher = /\(Arm-Finisher\)/.test(r[1])
      const name = r[1].replace(/\s*\(Arm-Finisher\)/, '')
      const amounts = {}
      weekNums.forEach((w, i) => {
        amounts[w] = parseAmount(r[2 + i], name)
      })
      for (const w of weekNums) {
        const a = amounts[w]
        if (a.sameAsWeek) {
          const ref = amounts[a.sameAsWeek]
          if (!ref) fail(`Week ${w} refers to W${a.sameAsWeek} which is not in the same phase`)
          amounts[w] = { ...ref, raw: a.raw, ...(a.note ? { note: a.note } : {}) }
        }
      }
      const ex = {
        id: `${idm[1]}${idm[2]}`,
        order: Number(idm[2]),
        exerciseId: slug(name),
        name,
        block: finisher ? 'finisher' : 'main',
        libraryId: libraryIdFor(name),
        weeks: amounts,
      }
      if (/^Reverse Lunge/.test(name)) ex.painFreeAlternative = 'Split Squat'
      byWorkout[idm[1]].push(ex)
    }
    // Superset groups per section 7: main 1+2, 3+4, then 5 and 6 on their own; finishers together.
    for (const key of ['A', 'B']) {
      const main = byWorkout[key].filter((e) => e.block === 'main')
      main.forEach((e, i) => {
        e.group = i < 4 ? Math.floor(i / 2) + 1 : i - 1
      })
      byWorkout[key].filter((e) => e.block === 'finisher').forEach((e) => (e.group = 99))
    }
    kbPhases[pid] = { weeks: weekNums, A: byWorkout.A, B: byWorkout.B }
  }
}

// ---------- workout C ----------
const workoutC = { rows: [], notes: [] }
{
  const sec = section(/Workout C/, '### ')
  const t = tablesIn(sec)[0]
  workoutC.columns = t.header
  workoutC.rows = t.rows.map((r) => ({ exercise: r[0], reps: r[1], phase1: r[2], phase2: r[3], phase34: r[4] }))
  workoutC.notes = paragraphs(sec)
}

// ---------- session flow (section 7) ----------
const flow = (() => {
  const sec = section(/^## 7\./)
  return { parts: tablesIn(sec)[0].rows.map((r) => ({ part: r[0], content: r[1], duration: r[2] })), notes: paragraphs(sec) }
})()

// ---------- knee program (section 8) ----------
const knee = { phases: ['P1', 'P2', 'P3', 'P4'], exercises: [], notes: [] }
{
  const sec = section(/^## 8\./)
  const t = tablesIn(sec)[0]
  for (const r of t.rows) {
    const perPhase = {}
    ;['P1', 'P2', 'P3', 'P4'].forEach((p, i) => {
      const raw = r[3 + i]
      if (raw === '–') {
        perPhase[p] = null
        return
      }
      const m = raw.match(/^(\d+) × (\d+)( s)?(\/S| Schritte\/Richtung)?(?:,? ?(.*))?$/)
      if (!m) fail(`Cannot parse knee cell: "${raw}"`)
      const wm = raw.match(/@ (\d+) kg/)
      perPhase[p] = {
        raw,
        sets: Number(m[1]),
        ...(m[3] ? { seconds: Number(m[2]) } : { reps: Number(m[2]) }),
        perSide: m[4] === '/S',
        ...(wm ? { weights: [Number(wm[1])] } : {}),
      }
    })
    const id = r[0]
    knee.exercises.push({
      id,
      day: Number(id.slice(1)) <= 3 ? 'wed' : 'sat',
      name: r[1],
      goal: r[2],
      libraryId: null,
      phases: perPhase,
    })
  }
  knee.notes = paragraphs(sec)
}

// ---------- bike (section 10) ----------
const bike = { workouts: [], notes: [] }
{
  const sec = section(/^## 10\./)
  const t = tablesIn(sec)[0]
  bike.workouts = t.rows.map((r) => {
    const m = r[0].match(/^(.*?)(?: (V\d(?:\/V\d)*))?$/)
    return {
      id: slug(r[0]),
      name: r[0],
      base: m[1],
      versions: m[2] ? m[2].split('/') : [],
      content: r[1],
      duration: r[2],
      weeks: r[3],
    }
  })
  bike.notes = paragraphs(sec)
}

// ---------- weight targets (section 5) ----------
const weightTargets = []
{
  const t = tablesIn(section(/^## 5\./))[0]
  for (const r of t.rows)
    weightTargets.push({
      week: Number(r[0]),
      sunday: dmyToIso(r[1]),
      target: num(r[2]),
      min: num(r[3]),
      max: num(r[4]),
      checkpoint: r[5] === 'ja',
    })
}
const weightNotes = paragraphs(section(/^## 5\./))

// ---------- rules (section 11) ----------
const rules = (() => {
  const sec = section(/^## 11\./)
  return {
    tiers: tablesIn(sec)[0].rows.map((r) => ({ name: r[0], when: r[1], content: r[2], hoursPerWeek: r[3] })),
    notes: paragraphs(sec),
  }
})()

// ---------- shopping (section 12) ----------
const shopping = []
{
  const t = tablesIn(section(/^## 12\./))[0]
  for (const r of t.rows) {
    const wm = r[4].match(/^W(\d+)/)
    shopping.push({
      id: slug(r[0]) + '-' + slug(r[4]),
      item: r[0],
      quantity: r[1],
      priority: r[2],
      orderBy: dmyToIso(r[3]),
      orderByNote: /buchen/.test(r[3]) ? 'buchen' : undefined,
      neededFromWeek: Number(wm[1]),
    })
  }
}

// ---------- checklists (section 13) ----------
const checklists = []
{
  let group = null
  for (const l of section(/^## 13\./)) {
    const h = l.match(/^\*\*(.+)\*\*$/)
    if (h) {
      const due = h[1].match(/bis (\d{2})\.(\d{2})\.\)/)
      group = {
        id: slug(h[1]),
        title: h[1].replace(/\s*\(.*\)$/, ''),
        ...(due ? { dueDate: isoFromDmy(due[1], due[2], '2026') } : {}),
        items: [],
      }
      checklists.push(group)
    } else if (l.startsWith('- [ ] ')) {
      const textItem = l.slice(6)
      const wk = textItem.match(/^Woche (\d+):/)
      group.items.push({
        id: `${group.id}-${group.items.length + 1}`,
        text: textItem,
        ...(wk ? { week: Number(wk[1]) } : {}),
      })
    }
  }
}

// ---------- metrics (section 14) ----------
const metrics = tablesIn(section(/^## 14\./))[0].rows.map((r) => ({ name: r[0], when: r[1], unit: r[2] }))

// ---------- assemble ----------
const seed = {
  schemaVersion: 1,
  sourceHash: crypto.createHash('sha256').update(text).digest('hex').slice(0, 16),
  planStart: PLAN_START,
  prepStart: '2026-11-30',
  planEnd: weeks.at(-1).end,
  phases,
  weeks,
  library,
  kb: kbPhases,
  workoutC,
  sessionFlow: flow,
  knee,
  bike,
  weightTargets,
  weightNotes,
  rules,
  shopping,
  checklists,
  metrics,
}

// Safety net: no personal master data may end up in the (public) seed.
const json = JSON.stringify(seed, null, 1)
// The forbidden words are read from section 1 at runtime so no personal value is hard-coded here.
const master = Object.fromEntries(tablesIn(section(/^## 1\./))[0].rows.map((r) => [r[0], r[1]]))
const forbidden = [master['Nutzer'], ...(master['Alter / Größe'] ?? '').split('/').map((s) => s.trim())]
  .filter(Boolean)
  .map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
forbidden.push(/MRT/, /Startgewicht/, /Stammdaten/)
for (const bad of forbidden) if (bad.test(json)) fail(`Seed contains personal data matching ${bad}`)

fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync('src/data/plan-seed.json', json + '\n')
console.log(`plan-seed.json written (${(json.length / 1024).toFixed(0)} kB, hash ${seed.sourceHash})`)
console.log(`Weeks: ${weeks.length}, KB phases: ${Object.keys(kbPhases).join(',')}, bike workouts: ${bike.workouts.length}`)
if (unmatched.length) console.log('Exercises without library entry:', [...new Set(unmatched)].join(' | '))
