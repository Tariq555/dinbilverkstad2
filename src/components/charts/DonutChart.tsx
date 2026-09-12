export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
  size?: number
  formatValue?: (value: number) => string
}

const STROKE = 15
const RADIUS = 50

/** Ringdiagram i ren SVG — används för fördelningen sommar/vinter/helår. */
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  size = 148,
  formatValue = (value) => `${value} st`,
}: DonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const circumference = 2 * Math.PI * RADIUS
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" style={{ width: size, height: size, flexShrink: 0 }}>
        <g transform="translate(70 70) rotate(-90)">
          <circle r={RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          {total > 0 &&
            slices.map((slice) => {
              const fraction = slice.value / total
              const dash = fraction * circumference
              const element = (
                <circle
                  key={slice.label}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              )
              offset += dash
              return element
            })}
        </g>
        <text className="donut-center-value" x="70" y="68" textAnchor="middle">
          {centerValue}
        </text>
        <text className="donut-center-label" x="70" y="84" textAnchor="middle">
          {centerLabel}
        </text>
      </svg>

      <div className="legend">
        {slices.map((slice) => (
          <div key={slice.label} className="legend-item">
            <span className="legend-swatch" style={{ background: slice.color }} />
            <span className="muted">{slice.label}</span>
            <span className="legend-value">{formatValue(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
