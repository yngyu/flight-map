import { Plane } from "lucide-react";
import type { ReactElement } from "react";
import type { YearlyFlightCount } from "./types";

export default function YearlyFlightsChart({
  data,
}: {
  readonly data: readonly YearlyFlightCount[];
}): ReactElement {
  const width = 520;
  const height = 220;
  const left = 38;
  const right = 16;
  const top = 18;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...data.map(({ count }) => count));
  const x = (index: number) =>
    data.length <= 1 ? left + plotWidth / 2 : left + (index / (data.length - 1)) * plotWidth;
  const y = (count: number) => top + plotHeight - (count / maximum) * plotHeight;
  const points = data.map(({ count }, index) => `${x(index)},${y(count)}`).join(" ");
  const labelInterval = Math.max(1, Math.ceil(data.length / 8));

  return (
    <article className="yearly-flights-card">
      <header>
        <span className="statistics-card-icon time" aria-hidden="true"><Plane size={22} /></span>
        <div>
          <span className="statistics-card-label">Timeline</span>
          <h3>Flights per year</h3>
        </div>
      </header>
      {data.length > 0 ? (
        <svg
          className="yearly-flights-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Line chart showing flights per year"
        >
          {[0, 0.5, 1].map((ratio) => {
            const gridY = top + plotHeight * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1={left} y1={gridY} x2={width - right} y2={gridY} className="year-grid-line" />
                <text x={left - 8} y={gridY + 4} className="year-axis-count">
                  {Math.round(maximum * ratio)}
                </text>
              </g>
            );
          })}
          {data.length > 1 ? <polyline points={points} className="year-chart-line" /> : null}
          {data.map(({ year, count }, index) => (
            <g className="year-chart-datum" key={year}>
              <circle cx={x(index)} cy={y(count)} r="4" className="year-chart-point">
                <title>{`${year}: ${count} flights`}</title>
              </circle>
              <text x={x(index)} y={y(count) - 10} className="year-point-count">{count}</text>
              {index % labelInterval === 0 || index === data.length - 1 ? (
                <text x={x(index)} y={height - 10} className="year-axis-label">{year}</text>
              ) : null}
            </g>
          ))}
        </svg>
      ) : (
        <p className="yearly-flights-empty">No dated flights</p>
      )}
    </article>
  );
}
