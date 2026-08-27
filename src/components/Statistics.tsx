import {
  Clock,
  Cloud,
  Globe2,
  Maximize2,
  Moon,
  Plane,
  Ruler,
  Sun,
  TowerControl,
  X,
} from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import type { Flight } from "../lib/flights";
import { countryAtCoordinates } from "./visitedMapData";

interface StatisticsProps {
  readonly flights: readonly Flight[];
  readonly sourceName: string;
}

interface UsageItem {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly displayValue?: string;
}

type UsageCategory =
  | "airports"
  | "routes"
  | "countries"
  | "airlines-count"
  | "airlines-distance"
  | "aircraft-count"
  | "aircraft-distance";

type ExpandedUsage = UsageCategory | null;

// A simple passenger estimate based on 115 g of CO₂ per passenger-kilometre.
const co2KgPerPassengerKm = 0.115;

export default function Statistics({ flights, sourceName }: StatisticsProps): ReactElement {
  const [expandedUsage, setExpandedUsage] = useState<ExpandedUsage>(null);
  const totalDistanceKm = flights.reduce((total, flight) => total + flight.distanceKm, 0);
  const totalFlightMinutes = flights.reduce(
    (total, flight) => total + durationInMinutes(flight.duration),
    0,
  );
  const totalCo2Kg = totalDistanceKm * co2KgPerPassengerKm;
  const timeConversions = flightTimeConversions(totalFlightMinutes);
  const distanceComparisons = flightDistanceComparisons(totalDistanceKm);
  const distanceExtremes = findFlightExtremes(flights, (flight) => flight.distanceKm);
  const durationExtremes = findFlightExtremes(flights, (flight) =>
    durationInMinutes(flight.duration),
  );
  const { airports: airportUsage, routes: routeUsage } = buildUsageStatistics(flights);
  const airlineUsage = buildNamedUsageStatistics(flights, (flight) => flight.airline || "Unknown");
  const aircraftUsage = buildNamedUsageStatistics(flights, (flight) => flight.aircraft || "Unknown");
  const countryUsage = buildCountryUsageStatistics(flights);
  const flightsByYear = buildFlightsByYear(flights);
  const usageViews: Record<UsageCategory, { readonly title: string; readonly items: readonly UsageItem[] }> = {
    airports: { title: "Most used airports", items: airportUsage },
    routes: { title: "Most used routes", items: routeUsage },
    countries: { title: "Most visited countries", items: countryUsage },
    "airlines-count": { title: "Most used airlines", items: airlineUsage.byCount },
    "airlines-distance": { title: "Airlines by distance", items: airlineUsage.byDistance },
    "aircraft-count": { title: "Most used aircraft", items: aircraftUsage.byCount },
    "aircraft-distance": { title: "Aircraft by distance", items: aircraftUsage.byDistance },
  };

  useEffect(() => {
    if (expandedUsage === null) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedUsage(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedUsage]);

  return (
    <section
      id="statistics-page"
      className="statistics-page"
      role="tabpanel"
      aria-labelledby="statistics-tab"
    >
      <header className="statistics-header">
        <div>
          <span className="page-eyebrow">Flight Map</span>
          <h2>Flight Statistics</h2>
          <p>Summary of {sourceName}</p>
        </div>
      </header>

      <div className="statistics-summary" aria-label="Flight summary">
        <article className="statistics-card">
          <span className="statistics-card-icon" aria-hidden="true">
            <Plane size={22} />
          </span>
          <div>
            <span className="statistics-card-label">Flights</span>
            <strong>{flights.length.toLocaleString()}</strong>
          </div>
        </article>

        <article className="statistics-card">
          <span className="statistics-card-icon time" aria-hidden="true">
            <Clock size={22} />
          </span>
          <div>
            <span className="statistics-card-label">Total flight time</span>
            <strong>{formatDuration(totalFlightMinutes)}</strong>
          </div>
        </article>

        <article className="statistics-card">
          <span className="statistics-card-icon distance" aria-hidden="true">
            <Ruler size={22} />
          </span>
          <div>
            <span className="statistics-card-label">Total distance</span>
            <strong>{Math.round(totalDistanceKm).toLocaleString()} km</strong>
          </div>
        </article>

        <article className="statistics-card">
          <span className="statistics-card-icon co2" aria-hidden="true">
            <Cloud size={22} />
          </span>
          <div>
            <span className="statistics-card-label">Total CO₂ emissions</span>
            <strong>{formatCo2(totalCo2Kg)}</strong>
          </div>
        </article>
      </div>

      <div className="statistics-details">
        <article className="flight-time-summary">
          <div className="flight-time-summary-heading">
            <span className="statistics-card-icon time" aria-hidden="true">
              <Clock size={22} />
            </span>
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
            <span className="statistics-card-icon distance" aria-hidden="true">
              <Ruler size={22} />
            </span>
            <span className="statistics-card-label">Distance</span>
            <strong>{Math.round(totalDistanceKm).toLocaleString()} km</strong>
          </div>
          <div className="distance-comparisons">
            {distanceComparisons.map(
              ({ icon, label, multiple, progress, fractionalProgress }) => (
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
              ),
            )}
          </div>
        </article>
      </div>

      {distanceExtremes !== null && durationExtremes !== null ? (
        <div className="statistics-extremes">
          <article className="extremes-card">
            <header className="extremes-card-heading">
              <span className="statistics-card-icon distance" aria-hidden="true">
                <Ruler size={22} />
              </span>
              <div>
                <span className="statistics-card-label">Distance</span>
                <h3>Longest & shortest flights</h3>
              </div>
            </header>
            <div className="extremes-list">
              <FlightExtreme
                flight={distanceExtremes.longest}
                label="Longest"
                value={`${Math.round(distanceExtremes.longest.distanceKm).toLocaleString()} km`}
              />
              <FlightExtreme
                flight={distanceExtremes.shortest}
                label="Shortest"
                value={`${Math.round(distanceExtremes.shortest.distanceKm).toLocaleString()} km`}
              />
            </div>
          </article>

          <article className="extremes-card">
            <header className="extremes-card-heading">
              <span className="statistics-card-icon time" aria-hidden="true">
                <Clock size={22} />
              </span>
              <div>
                <span className="statistics-card-label">Flight time</span>
                <h3>Longest & shortest flights</h3>
              </div>
            </header>
            <div className="extremes-list">
              <FlightExtreme
                flight={durationExtremes.longest}
                label="Longest"
                value={formatDuration(durationInMinutes(durationExtremes.longest.duration))}
              />
              <FlightExtreme
                flight={durationExtremes.shortest}
                label="Shortest"
                value={formatDuration(durationInMinutes(durationExtremes.shortest.duration))}
              />
            </div>
          </article>
        </div>
      ) : null}

      <div className="statistics-usage">
        <UsageCard
          icon={<TowerControl size={22} />}
          title="Most used airports"
          items={airportUsage}
          onExpand={() => setExpandedUsage("airports")}
        />
        <UsageCard
          icon={<Plane size={22} />}
          title="Most used routes"
          items={routeUsage}
          onExpand={() => setExpandedUsage("routes")}
        />
      </div>

      <div className="statistics-usage">
        <UsageCard
          icon={<TailFinIcon />}
          title="Most used airlines"
          items={airlineUsage.byCount}
          onExpand={() => setExpandedUsage("airlines-count")}
        />
        <UsageCard
          icon={<TailFinIcon />}
          eyebrow="Top 5 · distance"
          title="Airlines by distance"
          items={airlineUsage.byDistance}
          onExpand={() => setExpandedUsage("airlines-distance")}
        />
      </div>

      <div className="statistics-usage">
        <UsageCard
          icon={<AircraftSideIcon />}
          title="Most used aircraft"
          items={aircraftUsage.byCount}
          onExpand={() => setExpandedUsage("aircraft-count")}
        />
        <UsageCard
          icon={<AircraftSideIcon />}
          eyebrow="Top 5 · distance"
          title="Aircraft by distance"
          items={aircraftUsage.byDistance}
          onExpand={() => setExpandedUsage("aircraft-distance")}
        />
      </div>

      <div className="statistics-final-charts">
        <UsageCard
          icon={<Globe2 size={22} />}
          eyebrow="Top 5 · visits"
          title="Most visited countries"
          items={countryUsage}
          onExpand={() => setExpandedUsage("countries")}
        />
        <YearlyFlightsChart data={flightsByYear} />
      </div>

      {expandedUsage !== null ? (
        <div className="usage-dialog-backdrop" role="presentation" onClick={() => setExpandedUsage(null)}>
          <section
            className="usage-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="page-eyebrow">All data</span>
                <h2 id="usage-dialog-title">{usageViews[expandedUsage].title}</h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => setExpandedUsage(null)}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <UsageList items={usageViews[expandedUsage].items} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

interface UsageCardProps {
  readonly icon: ReactElement;
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly UsageItem[];
  readonly onExpand: () => void;
}

function UsageCard({
  icon,
  eyebrow = "Top 5 · flights",
  title,
  items,
  onExpand,
}: UsageCardProps): ReactElement {
  return (
    <button className="usage-card" type="button" onClick={onExpand}>
      <header>
        <span className="statistics-card-icon" aria-hidden="true">{icon}</span>
        <div>
          <span className="statistics-card-label">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <Maximize2 size={18} aria-hidden="true" />
      </header>
      <UsageList items={items.slice(0, 5)} />
    </button>
  );
}

function UsageList({ items }: { readonly items: readonly UsageItem[] }): ReactElement {
  const maximum = items[0]?.count ?? 0;

  return (
    <div className="usage-list">
      {items.length === 0 ? <p>No flight data</p> : null}
      {items.map((item) => (
        <div className="usage-row" key={item.key}>
          <span title={item.label}>{item.label}</span>
          <span className="usage-bar" aria-hidden="true">
            <span style={{ width: `${maximum === 0 ? 0 : (item.count / maximum) * 100}%` }} />
          </span>
          <strong>{item.displayValue ?? item.count.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function YearlyFlightsChart({
  data,
}: {
  readonly data: readonly { readonly year: string; readonly count: number }[];
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
        <span className="statistics-card-icon time" aria-hidden="true">
          <Plane size={22} />
        </span>
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
              <text x={x(index)} y={y(count) - 10} className="year-point-count">
                {count}
              </text>
              {index % labelInterval === 0 || index === data.length - 1 ? (
                <text x={x(index)} y={height - 10} className="year-axis-label">
                  {year}
                </text>
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

function TailFinIcon(): ReactElement {
  return (
    <svg width="25" height="23" viewBox="0 0 26 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 18.8h21M4 18.8c3.8-.2 6.2-2.1 8.1-5.2l5.2-8.1c.5-.8 1.2-1.2 2.1-1.2H22l-2.8 14.5H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m19.8 7.2-2.2 11.6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.72"
      />
    </svg>
  );
}

function AircraftSideIcon(): ReactElement {
  return <Plane size={22} style={{ transform: "rotate(45deg)" }} aria-hidden="true" />;
}

interface FlightExtremeProps {
  readonly flight: Flight;
  readonly label: string;
  readonly value: string;
}

function FlightExtreme({ flight, label, value }: FlightExtremeProps): ReactElement {
  return (
    <div className="flight-extreme">
      <span>{label}</span>
      <strong>
        {flight.start.code} <b aria-hidden="true">→</b> {flight.destination.code}
      </strong>
      <small>{value}</small>
      <time dateTime={flight.date}>{flight.date}</time>
    </div>
  );
}

function durationInMinutes(duration: string): number {
  const match = /^(\d+):(\d{1,2})/.exec(duration.trim());

  if (match === null) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, "0")} h ${minutes.toString().padStart(2, "0")} m`;
}

function flightTimeConversions(
  totalMinutes: number,
): readonly { readonly label: string; readonly value: string }[] {
  const totalHours = totalMinutes / 60;
  const conversions = [
    { label: "days", value: totalHours / 24 },
    { label: "weeks", value: totalHours / (24 * 7) },
    { label: "months", value: totalHours / (24 * 365.25 / 12) },
    { label: "years", value: totalHours / (24 * 365.25) },
  ];

  return conversions.filter(({ value }) => value >= 0.01).map(({ label, value }) => ({
    label,
    value: value.toLocaleString(undefined, { maximumSignificantDigits: 3 }),
  }));
}

function findFlightExtremes(
  flights: readonly Flight[],
  metric: (flight: Flight) => number,
): { readonly longest: Flight; readonly shortest: Flight } | null {
  const measurableFlights = flights.filter((flight) => metric(flight) > 0);

  if (measurableFlights.length === 0) {
    return null;
  }

  return measurableFlights.slice(1).reduce(
    (extremes, flight) => ({
      longest: metric(flight) > metric(extremes.longest) ? flight : extremes.longest,
      shortest: metric(flight) < metric(extremes.shortest) ? flight : extremes.shortest,
    }),
    { longest: measurableFlights[0], shortest: measurableFlights[0] },
  );
}

function buildCountryUsageStatistics(flights: readonly Flight[]): readonly UsageItem[] {
  const totals = new Map<string, number>();

  flights.forEach((flight) => {
    const startCountry = countryAtCoordinates(flight.start.lon, flight.start.lat);
    const destinationCountry = countryAtCoordinates(
      flight.destination.lon,
      flight.destination.lat,
    );

    if (
      startCountry === undefined ||
      destinationCountry === undefined ||
      startCountry === destinationCountry
    ) {
      return;
    }

    [startCountry, destinationCountry].forEach((country) => {
      if (country.toLowerCase() !== "unknown country") {
        totals.set(country, (totals.get(country) ?? 0) + 1);
      }
    });
  });

  return Array.from(totals, ([label, count]) => ({ key: label, label, count })).sort(
    compareUsageItems,
  );
}

function buildFlightsByYear(
  flights: readonly Flight[],
): readonly { readonly year: string; readonly count: number }[] {
  const totals = new Map<number, number>();

  flights.forEach((flight) => {
    const year = Number(flight.year);

    if (Number.isInteger(year)) {
      totals.set(year, (totals.get(year) ?? 0) + 1);
    }
  });

  const years = Array.from(totals.keys()).sort((left, right) => left - right);

  if (years.length === 0) {
    return [];
  }

  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  if (lastYear - firstYear > 200) {
    return years.map((year) => ({ year: String(year), count: totals.get(year) ?? 0 }));
  }

  return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
    const year = firstYear + index;
    return { year: String(year), count: totals.get(year) ?? 0 };
  });
}

function buildNamedUsageStatistics(
  flights: readonly Flight[],
  name: (flight: Flight) => string,
): { readonly byCount: readonly UsageItem[]; readonly byDistance: readonly UsageItem[] } {
  const totals = new Map<string, { count: number; distanceKm: number }>();

  flights.forEach((flight) => {
    const label = name(flight).trim();

    if (label.length === 0 || label.toLowerCase() === "unknown") {
      return;
    }

    const current = totals.get(label);
    totals.set(label, {
      count: (current?.count ?? 0) + 1,
      distanceKm: (current?.distanceKm ?? 0) + flight.distanceKm,
    });
  });

  const byCount = Array.from(totals, ([label, total]) => ({
    key: label,
    label,
    count: total.count,
  })).sort(compareUsageItems);
  const byDistance = Array.from(totals, ([label, total]) => ({
    key: label,
    label,
    count: total.distanceKm,
    displayValue: `${Math.round(total.distanceKm).toLocaleString()} km`,
  })).sort(compareUsageItems);

  return { byCount, byDistance };
}

function buildUsageStatistics(
  flights: readonly Flight[],
): { readonly airports: readonly UsageItem[]; readonly routes: readonly UsageItem[] } {
  const airportCounts = new Map<string, { label: string; count: number }>();
  const routes = new Map<
    string,
    { first: Flight["start"]; second: Flight["destination"]; count: number }
  >();

  flights.forEach((flight) => {
    [flight.start, flight.destination].forEach((airport) => {
      const current = airportCounts.get(airport.code);
      airportCounts.set(airport.code, {
        label: `${airport.code} (${airport.label})`,
        count: (current?.count ?? 0) + 1,
      });
    });

    const [first, second] =
      flight.start.code.localeCompare(flight.destination.code) <= 0
        ? [flight.start, flight.destination]
        : [flight.destination, flight.start];
    const key = `${first.code}-${second.code}`;
    const currentRoute = routes.get(key);
    routes.set(key, {
      first,
      second,
      count: (currentRoute?.count ?? 0) + 1,
    });
  });

  const airports = Array.from(airportCounts, ([key, item]) => ({ key, ...item })).sort(
    compareUsageItems,
  );
  const routeItems = Array.from(routes, ([key, route]) => {
    const firstCount = airportCounts.get(route.first.code)?.count ?? 0;
    const secondCount = airportCounts.get(route.second.code)?.count ?? 0;
    const [left, right] =
      secondCount > firstCount ? [route.second, route.first] : [route.first, route.second];

    return {
      key,
      label: `${left.code} – ${right.code}`,
      count: route.count,
      mostUsedAirportCount: Math.max(firstCount, secondCount),
      combinedAirportCount: firstCount + secondCount,
    };
  })
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.mostUsedAirportCount - left.mostUsedAirportCount ||
        right.combinedAirportCount - left.combinedAirportCount ||
        left.label.localeCompare(right.label),
    )
    .map(({ key, label, count }) => ({ key, label, count }));

  return { airports, routes: routeItems };
}

function compareUsageItems(left: UsageItem, right: UsageItem): number {
  return right.count - left.count || left.label.localeCompare(right.label);
}

function flightDistanceComparisons(totalDistanceKm: number) {
  const references = [
    { icon: "earth", label: "Around Earth", distanceKm: 40_075 },
    { icon: "moon", label: "To the Moon", distanceKm: 384_400 },
    { icon: "sun", label: "To the Sun", distanceKm: 149_597_870 },
  ] as const;

  return references
    .map(({ icon, label, distanceKm }) => {
      const multiple = totalDistanceKm / distanceKm;
      const fraction = multiple % 1;

      return {
        icon,
        label,
        multiple,
        progress: Math.min(multiple, 1),
        fractionalProgress: multiple > 1 && fraction > 0 ? fraction : null,
      };
    })
    .filter(({ multiple }) => multiple >= 0.01);
}

function formatMultiple(value: number): string {
  return value.toLocaleString(undefined, { maximumSignificantDigits: 3 });
}

function formatCo2(valueKg: number): string {
  if (valueKg >= 1_000) {
    return `${(valueKg / 1_000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} t`;
  }

  return `${Math.round(valueKg).toLocaleString()} kg`;
}
