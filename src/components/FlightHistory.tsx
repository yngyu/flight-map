import { History } from "lucide-react";
import { useMemo, type ReactElement } from "react";
import type { Flight } from "../lib/flights";

interface FlightHistoryProps {
  readonly flights: readonly Flight[];
  readonly sourceName: string;
}

export default function FlightHistory({
  flights,
  sourceName,
}: FlightHistoryProps): ReactElement {
  const sortedFlights = useMemo(
    () => [...flights].sort(compareFlightsNewestFirst),
    [flights],
  );

  return (
    <section
      id="history-page"
      className="flight-history-page"
      role="tabpanel"
      aria-labelledby="history-tab"
    >
      <header className="flight-history-header">
        <div>
          <span className="page-eyebrow">Flight log</span>
          <h2>Flight History</h2>
          <p>{sourceName}</p>
        </div>
        <div className="flight-history-count">
          <History size={18} aria-hidden="true" />
          <strong>{sortedFlights.length.toLocaleString()}</strong>
          <span>flights</span>
        </div>
      </header>

      <div className="flight-history-table-frame">
        <table className="flight-history-table">
          <thead>
            <tr>
              <th scope="col">Departure</th>
              <th scope="col">From</th>
              <th scope="col">Arrival</th>
              <th scope="col">To</th>
              <th scope="col">Airline</th>
              <th scope="col">Aircraft</th>
            </tr>
          </thead>
          <tbody>
            {sortedFlights.map((flight) => (
              <tr key={flight.id}>
                <td><FlightDateTime date={flight.date} time={flight.departureTime} /></td>
                <td><AirportCell code={flight.start.code} city={flight.start.label} /></td>
                <td><FlightDateTime date={flight.date} time={flight.arrivalTime} /></td>
                <td>
                  <AirportCell code={flight.destination.code} city={flight.destination.label} />
                </td>
                <td>{flight.airline || <span className="history-empty-value">—</span>}</td>
                <td>{flight.aircraft || <span className="history-empty-value">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedFlights.length === 0 ? (
          <div className="flight-history-empty">No flight history found.</div>
        ) : null}
      </div>
    </section>
  );
}

function FlightDateTime({ date, time }: { readonly date: string; readonly time: string }): ReactElement {
  return (
    <span className="history-date-time">
      <strong>{date || "—"}</strong>
      {time ? <span>{time}</span> : null}
    </span>
  );
}

function AirportCell({ code, city }: { readonly code: string; readonly city: string }): ReactElement {
  return (
    <span className="history-airport">
      <strong>{code || "—"}</strong>
      {city && city !== code ? <span>{city}</span> : null}
    </span>
  );
}

function compareFlightsNewestFirst(left: Flight, right: Flight): number {
  const leftTimestamp = flightTimestamp(left);
  const rightTimestamp = flightTimestamp(right);

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return right.date.localeCompare(left.date) || right.departureTime.localeCompare(left.departureTime);
}

function flightTimestamp(flight: Flight): number {
  const isoTimestamp = Date.parse(`${flight.date}T${flight.departureTime || "00:00"}`);

  if (!Number.isNaN(isoTimestamp)) {
    return isoTimestamp;
  }

  const dateTimestamp = Date.parse(flight.date);
  return Number.isNaN(dateTimestamp) ? 0 : dateTimestamp;
}
