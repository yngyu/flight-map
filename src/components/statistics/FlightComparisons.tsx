import { Clock, Globe2, Moon, Ruler, Sun } from "lucide-react";
import type { ReactElement } from "react";
import { formatDuration, formatMultiple } from "./statisticsData";
import type { DistanceComparison, TimeConversion } from "./types";

interface FlightComparisonsProps {
  readonly totalFlightMinutes: number;
  readonly totalDistanceKm: number;
  readonly timeConversions: readonly TimeConversion[];
  readonly distanceComparisons: readonly DistanceComparison[];
}

export default function FlightComparisons({
  totalFlightMinutes,
  totalDistanceKm,
  timeConversions,
  distanceComparisons,
}: FlightComparisonsProps): ReactElement {
  return (
    <div className="statistics-details">
      <article className="flight-time-summary">
        <div className="flight-time-summary-heading">
          <span className="statistics-card-icon time" aria-hidden="true"><Clock size={22} /></span>
          <span className="statistics-card-label">Flight time</span>
          <strong>{formatDuration(totalFlightMinutes)}</strong>
        </div>
        {timeConversions.length > 0 ? (
          <div className="flight-time-conversions">
            {timeConversions.map(({ label, value }) => (
              <div className="flight-time-conversion" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article className="distance-summary">
        <div className="distance-summary-heading">
          <span className="statistics-card-icon distance" aria-hidden="true"><Ruler size={22} /></span>
          <span className="statistics-card-label">Distance</span>
          <strong>{Math.round(totalDistanceKm).toLocaleString()} km</strong>
        </div>
        <div className="distance-comparisons">
          {distanceComparisons.map(({ icon, label, multiple, progress, fractionalProgress }) => (
            <div className="distance-comparison" key={label}>
              <span className="distance-comparison-icon" aria-hidden="true">
                {icon === "earth" ? <Globe2 size={18} /> : null}
                {icon === "moon" ? <Moon size={18} /> : null}
                {icon === "sun" ? <Sun size={18} /> : null}
              </span>
              <div
                className="distance-gauge"
                role="meter"
                aria-label={`${label}: ${formatMultiple(multiple)} times`}
                aria-valuenow={multiple}
              >
                <span className="distance-gauge-fill" style={{ width: `${progress * 100}%` }} />
                {fractionalProgress !== null ? (
                  <span
                    className="distance-gauge-marker"
                    style={{ left: `${fractionalProgress * 100}%` }}
                  />
                ) : null}
              </div>
              <strong>×{formatMultiple(multiple)}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
