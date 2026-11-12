interface Props {
  label: string
  unit?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  step?: number
}

/** Numeric input with large − / + buttons (one-hand use). */
export function NumberField({ label, unit, value, onChange, step = 1 }: Props) {
  const bump = (d: number) => onChange(Math.max(0, Math.round(((value ?? 0) + d) * 100) / 100))
  return (
    <div className="numfield">
      <span className="numlabel">
        {label}
        {unit ? ` (${unit})` : ''}
      </span>
      <div className="numrow">
        <button type="button" aria-label={`${label} verringern`} onClick={() => bump(-step)}>
          −
        </button>
        <input
          aria-label={label}
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.')
            onChange(t === '' || Number.isNaN(Number(t)) ? undefined : Number(t))
          }}
        />
        <button type="button" aria-label={`${label} erhöhen`} onClick={() => bump(step)}>
          +
        </button>
      </div>
    </div>
  )
}
