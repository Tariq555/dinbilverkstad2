import { useState } from 'react'

export interface BarDatum {
  label: string
  value: number
  secondary?: string
  highlight?: boolean
}

interface BarChartProps {
  data: BarDatum[]
  height?: number
  formatValue: (value: number) => string
  color?: string
}

const PADDING_TOP = 14
const AXIS_HEIGHT = 22
const GRID_LINES = 4

/**
 * Enkelt stapeldiagram i ren SVG.
 * Inga diagrambibliotek — snabbt att rita och fungerar helt utan internet.
 */
export function BarChart({ data, height = 200, formatValue, color = 'var(--accent)' }: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const max = Math.max(...data.map((item) => item.value), 1)
  const plotHeight = height - AXIS_HEIGHT - PADDING_TOP
  const slotWidth = 100 / Math.max(data.length, 1)
  const barWidth = Math.min(slotWidth * 0.58, 7)

  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height }}>
        {Array.from({ length: GRID_LINES + 1 }).map((_, index) => {
          const y = PADDING_TOP + (plotHeight / GRID_LINES) * index
          return <line key={index} className="chart-grid" x1="0" x2="100" y1={y} y2={y} strokeWidth="0.5" />
        })}

        {data.map((item, index) => {
          const barHeight = Math.max((item.value / max) * plotHeight, item.value > 0 ? 2 : 0)
          const x = slotWidth * index + slotWidth / 2 - barWidth / 2
          const y = PADDING_TOP + plotHeight - barHeight
          const isActive = hovered === index

          return (
            <g key={item.label}>
              <rect
                x={slotWidth * index}
                y={PADDING_TOP}
                width={slotWidth}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
              <rect
                className="chart-bar"
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="1.4"
                fill={item.highlight ? 'var(--accent)' : color}
                opacity={hovered === null || isActive ? 1 : 0.45}
                pointerEvents="none"
              />
            </g>
          )
        })}
      </svg>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          marginTop: -AXIS_HEIGHT + 4,
        }}
      >
        {data.map((item, index) => (
          <span
            key={item.label}
            className="chart-axis"
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: hovered === index ? 'var(--text)' : 'var(--text-dim)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
        ))}
      </div>

      {hovered !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${slotWidth * hovered + slotWidth / 2}%`, top: PADDING_TOP - 4 }}
        >
          <div className="chart-tooltip-label">{data[hovered].secondary ?? data[hovered].label}</div>
          <div className="chart-tooltip-value">{formatValue(data[hovered].value)}</div>
        </div>
      )}
    </div>
  )
}
