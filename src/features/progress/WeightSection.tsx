import { CartesianGrid, ComposedChart, Area, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Measurement } from '../../db/db'
import { formatDate, formatNumber } from '../../domain/format'
import { seed } from '../../domain/plan'
import { checkpointResults, twoAboveInARow, weightRows } from '../../domain/progress'

const ts = (iso: string) => Date.parse(iso + 'T12:00:00Z')
const STATUS = { above: 'über Korridor', below: 'unter Korridor', within: 'im Korridor', none: 'noch kein Wert' }

/** Body weight: daily values, 7-day average, weekly target corridor and the four control points. */
export function WeightSection({ measurements }: { measurements: Measurement[] }) {
  const rows = weightRows(measurements)
  const cps = checkpointResults(measurements)
  const pair = twoAboveInARow(cps)
  const hasData = measurements.some((m) => m.kind === 'weight')

  const all = rows.flatMap((r) => [r.raw, r.band?.[0], r.band?.[1]]).filter((v): v is number => v !== undefined)
  const lo = Math.floor(Math.min(...all)) - 1
  const hi = Math.ceil(Math.max(...all)) + 1
  const t0 = rows[0].t
  const t1 = rows[rows.length - 1].t

  return (
    <div className="stack">
      {pair && (
        <p className="notice" role="status">
          An den Kontrollpunkten Woche {pair[0].week} und Woche {pair[1].week} liegt dein 7-Tage-Schnitt über dem Korridor. Dann ist die Ernährung der Hebel, nicht mehr Training.
        </p>
      )}
      <div role="img" aria-label="Körpergewicht mit Zielkorridor">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[t0, t1]}
              ticks={seed.weightTargets.filter((w) => w.week % 4 === 0).map((w) => ts(w.sunday))}
              tickFormatter={(t) => formatDate(new Date(Number(t)).toISOString().slice(0, 10)).slice(0, 6)}
              stroke="var(--muted)"
              fontSize={12}
            />
            <YAxis domain={[lo, hi]} tickFormatter={(v) => String(v).replace(".", ",")} stroke="var(--muted)" fontSize={12} width={36} />
            <Tooltip
              labelFormatter={(t) => formatDate(new Date(Number(t)).toISOString().slice(0, 10))}
              formatter={(v, n) => [Array.isArray(v) ? `${formatNumber(Number(v[0]))} bis ${formatNumber(Number(v[1]), 'kg')}` : formatNumber(Number(v), 'kg'), n]}
            />
            {cps.map((c) => (
              <ReferenceLine key={c.week} x={ts(c.sunday)} stroke="var(--muted)" strokeDasharray="2 4" label={{ value: `W${c.week}`, fontSize: 11, fill: 'var(--muted)', position: 'insideTop' }} />
            ))}
            <Area dataKey="band" name="Zielkorridor" stroke="none" fill="var(--accent)" fillOpacity={0.15} connectNulls isAnimationActive={false} />
            <Line dataKey="target" name="Ziel" stroke="var(--muted)" strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="avg" name="7-Tage-Schnitt" stroke="var(--accent)" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="raw" name="Tageswert" stroke="none" dot={{ r: 2, fill: 'var(--accent)' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!hasData && <p className="muted">Noch keine Gewichtswerte. Trage sie täglich unten ein.</p>}
      <table className="datatable">
        <thead>
          <tr>
            <th>Kontrollpunkt</th>
            <th>Korridor</th>
            <th>Dein Schnitt</th>
          </tr>
        </thead>
        <tbody>
          {cps.map((c) => (
            <tr key={c.week}>
              <td>
                W{c.week} · {formatDate(c.sunday).slice(0, 6)}
              </td>
              <td>
                {formatNumber(c.min)}–{formatNumber(c.max, 'kg')}
              </td>
              <td className={`cp-${c.status}`}>
                {c.value === null ? '–' : formatNumber(c.value, 'kg')} <span className="muted">({STATUS[c.status]})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
