import { Clock, Cloud, Plane, Ruler } from "lucide-react";
import type { ReactElement } from "react";
import { formatCo2, formatDuration } from "./statisticsData";

interface SummaryCardsProps {
  readonly flightCount: number;
  readonly totalFlightMinutes: number;
  readonly totalDistanceKm: number;
  readonly totalCo2Kg: number;
}

export default function SummaryCards({
  flightCount,
  totalFlightMinutes,
  totalDistanceKm,
  totalCo2Kg,
}: SummaryCardsProps): ReactElement {
  return (
    <div className="statistics-summary" aria-label="Flight summary">
      <SummaryCard icon={<Plane size={22} />} label="Flights" value={flightCount.toLocaleString()} />
      <SummaryCard
        icon={<Clock size={22} />}
        iconClass="time"
        label="Total flight time"
        value={formatDuration(totalFlightMinutes)}
      />
      <SummaryCard
        icon={<Ruler size={22} />}
        iconClass="distance"
        label="Total distance"
        value={`${Math.round(totalDistanceKm).toLocaleString()} km`}
      />
      <SummaryCard
        icon={<Cloud size={22} />}
        iconClass="co2"
        label="Total CO₂ emissions"
        value={formatCo2(totalCo2Kg)}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  iconClass = "",
  label,
  value,
}: {
  readonly icon: ReactElement;
  readonly iconClass?: string;
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <article className="statistics-card">
      <span className={`statistics-card-icon ${iconClass}`} aria-hidden="true">{icon}</span>
      <div>
        <span className="statistics-card-label">{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
