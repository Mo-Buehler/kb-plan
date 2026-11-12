const PATHS: Record<string, string> = {
  kb: 'M8 8V7a4 4 0 0 1 8 0v1 M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
  bike: 'M6 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M6 15.5l4-7h5l3 7 M10 8.5l3 7 M9 6h3',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z',
  scale: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z M8 10a4 4 0 0 1 8 0 M12 10l2-2',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  leaf: 'M5 19C5 10 10 5 19 5c0 9-5 14-14 14z M5 19l7-7',
  walk: 'M13 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M11 21l2-6-3-3 1-4 4 2 2 3 M8 12l-2 3',
  moon: 'M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  chart: 'M4 19h16 M7 16V10 M12 16V6 M17 16v-4',
}

/** Small inline icon set (no external fonts or scripts). Decorative: the text next to it carries the meaning. */
export function Icon({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <svg className={`icon${large ? ' lg' : ''}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name] ?? PATHS.target} />
    </svg>
  )
}
