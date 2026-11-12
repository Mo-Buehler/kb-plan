import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate, formatNumber } from '../../domain/format'
import type { KbPoint, WeekCompliance } from '../../domain/progress'

const GRID = 'var(--border)'
const ACCENT = 'var(--accent)'
const MUTED = 'var(--muted)'
const short = (iso: string) => formatDate(iso).slice(0, 6)

function Empty() {
  return <p className="muted">Noch keine Werte erfasst.</p>
}

/** Value over time with unit, for waist, FTP, swing test, Workout C rounds. */
export function SimpleLine({ data, unit, digits = 0, label }: { data: { date: string; value: number }[]; unit: string; digits?: number; label: string }) {
  if (!data.length) return <Empty />
  return (
    <div role="img" aria-label={`${label} im Verlauf`}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={short} stroke={MUTED} fontSize={12} />
          <YAxis domain={['auto', 'auto']} tickFormatter={(v) => String(v).replace('.', ',')} stroke={MUTED} fontSize={12} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(d) => formatDate(String(d))} formatter={(v) => [formatNumber(Number(v), unit, digits), label]} />
          <Line dataKey="value" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Used weight and volume per week for one exercise. */
export function KbChart({ history }: { history: Map<string, KbPoint[]> }) {
  const names = [...history.keys()].sort()
  const [picked, setPicked] = useState('')
  if (!names.length) return <Empty />
  const name = names.includes(picked) ? picked : names[0]
  const data = history.get(name)!.map((p) => ({ ...p, label: `W${p.week}` }))
  return (
    <div className="stack">
      <label>
        Übung
        <select value={name} onChange={(e) => setPicked(e.target.value)}>
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <div role="img" aria-label={`Gewicht und Volumen für ${name}`}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={MUTED} fontSize={12} />
            <YAxis yAxisId="v" stroke={MUTED} fontSize={12} width={48} />
            <YAxis yAxisId="w" orientation="right" stroke={MUTED} fontSize={12} width={40} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [formatNumber(Number(v), 'kg', 0), n]} />
            <Legend />
            <Bar yAxisId="v" dataKey="volume" name="Volumen (kg)" fill={ACCENT} fillOpacity={0.35} isAnimationActive={false} />
            <Line yAxisId="w" dataKey="maxWeight" name="Gewicht (kg)" stroke={ACCENT} strokeWidth={2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="datatable">
        <thead>
          <tr>
            <th>Woche</th>
            <th>Gewicht</th>
            <th>Volumen</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.week}>
              <td>{p.week}</td>
              <td>{formatNumber(p.maxWeight, 'kg', 0)}</td>
              <td>{formatNumber(p.volume, 'kg', 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ComplianceChart({ data }: { data: WeekCompliance[] }) {
  if (!data.length) return <Empty />
  const rows = data.map((d) => ({ ...d, label: `W${d.week}`, pct: d.planned ? Math.round((d.done / d.planned) * 100) : 0 }))
  return (
    <div className="stack">
      <div role="img" aria-label="Erfüllungsquote pro Woche">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={MUTED} fontSize={12} />
            <YAxis allowDecimals={false} stroke={MUTED} fontSize={12} width={28} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Bar dataKey="planned" name="geplant" fill={MUTED} fillOpacity={0.4} isAnimationActive={false} />
            <Bar dataKey="done" name="erledigt" fill={ACCENT} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="datatable">
        <thead>
          <tr>
            <th>Woche</th>
            <th>Erledigt</th>
            <th>Quote</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.week}>
              <td>{r.week}</td>
              <td>
                {r.done} von {r.planned}
              </td>
              <td>{r.pct} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Tooltip colours follow the theme (default is always white). */
export const TOOLTIP_STYLE = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8 }
