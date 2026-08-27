import { Clock, Ruler } from "lucide-react";
import type { ReactElement } from "react";
import type { Flight } from "../../lib/flights";
import { durationInMinutes, formatDuration } from "./statisticsData";
import type { FlightExtremes as FlightExtremesData } from "./types";

export default function FlightExtremes({
  distance,
  duration,
}: {
  readonly distance: FlightExtremesData | null;
  readonly duration: FlightExtremesData | null;
}): ReactElement | null {
  if (distance === null || duration === null) {
    return null;
  }

  return (
    <div className="statistics-extremes">
      <ExtremeCard icon={<Ruler size={22} />} iconClass="distance" label="Distance">
        <FlightExtreme
          flight={distance.longest}
          label="Longest"
          value={`${Math.round(distance.longest.distanceKm).toLocaleString()} km`}
        />
        <FlightExtreme
          flight={distance.shortest}
          label="Shortest"
          value={`${Math.round(distance.shortest.distanceKm).toLocaleString()} km`}
        />
      </ExtremeCard>
      <ExtremeCard icon={<Clock size={22} />} iconClass="time" label="Flight time">
        <FlightExtreme
          flight={duration.longest}
          label="Longest"
          value={formatDuration(durationInMinutes(duration.longest.duration))}
        />
        <FlightExtreme
          flight={duration.shortest}
          label="Shortest"
          value={formatDuration(durationInMinutes(duration.shortest.duration))}
        />
      </ExtremeCard>
    </div>
  );
}

function ExtremeCard({
  icon,
  iconClass,
  label,
  children,
}: {
  readonly icon: ReactElement;
  readonly iconClass: string;
  readonly label: string;
  readonly children: ReactElement | readonly ReactElement[];
}): ReactElement {
  return (
    <article className="extremes-card">
      <header className="extremes-card-heading">
        <span className={`statistics-card-icon ${iconClass}`} aria-hidden="true">{icon}</span>
        <div>
          <span className="statistics-card-label">{label}</span>
          <h3>Longest & shortest flights</h3>
        </div>
      </header>
      <div className="extremes-list">{children}</div>
    </article>
  );
}

function FlightExtreme({
  flight,
  label,
  value,
}: {
  readonly flight: Flight;
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <div className="flight-extreme">
      <span>{label}</span>
      <strong>{flight.start.code} <b aria-hidden="true">→</b> {flight.destination.code}</strong>
      <small>{value}</small>
      <time dateTime={flight.date}>{flight.date}</time>
    </div>
  );
}
