import { AlertTriangle, FileUp, Plane, Rotate3D, Sparkles } from "lucide-react";
import type { ChangeEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import GlobeView from "./components/GlobeView";
import type { Flight, FlightLoadResult } from "./lib/flights";
import { loadDefaultFlights, loadFlightsFromCsvText } from "./lib/flights";

interface LoadState {
  readonly status: "loading" | "ready" | "error";
  readonly data: FlightLoadResult | null;
  readonly error: string;
}

const initialLoadState: LoadState = {
  status: "loading",
  data: null,
  error: "",
};

export default function App(): ReactElement {
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [selectedAirline, setSelectedAirline] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [hoveredFlight, setHoveredFlight] = useState<Flight | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadDefaultFlights()
      .then((data) => {
        if (isMounted) {
          setLoadState({ status: "ready", data, error: "" });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "Failed to load flights.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const flights = loadState.data?.flights ?? [];
  const missingLocations = loadState.data?.missingLocations ?? [];
  const lookupWarnings = loadState.data?.lookupWarnings ?? [];

  const airlines = useMemo(() => {
    const names = new Set(flights.map((flight) => flight.airline).filter(Boolean));

    return ["All", ...Array.from(names).sort()];
  }, [flights]);

  const years = useMemo(() => {
    const values = new Set(flights.map((flight) => flight.year).filter(Boolean));

    return ["All", ...Array.from(values).sort((left, right) => right.localeCompare(left))];
  }, [flights]);

  const visibleFlights = useMemo(() => {
    return flights.filter((flight) => {
      const matchesAirline = selectedAirline === "All" || flight.airline === selectedAirline;
      const matchesYear = selectedYear === "All" || flight.year === selectedYear;

      return matchesAirline && matchesYear;
    });
  }, [flights, selectedAirline, selectedYear]);

  useEffect(() => {
    setHoveredFlight(null);
  }, [selectedAirline, selectedYear]);

  const setHoverFlight = useCallback((flight: Flight | null) => {
    setHoveredFlight(flight);
  }, []);

  const loadCsvFile = useCallback((file: File) => {
    setLoadState({ status: "loading", data: null, error: "" });
    setSelectedAirline("All");
    setSelectedYear("All");
    setHoveredFlight(null);

    file
      .text()
      .then((text) => {
        return loadFlightsFromCsvText(text, file.name);
      })
      .then((data) => {
        setLoadState({ status: "ready", data, error: "" });
      })
      .catch((error: unknown) => {
        setLoadState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Failed to load CSV file.",
        });
      });
  }, []);

  const handleCsvFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];

      if (file !== undefined) {
        loadCsvFile(file);
      }

      event.currentTarget.value = "";
    },
    [loadCsvFile],
  );

  const totalDistanceKm = Math.round(
    visibleFlights.reduce((sum, flight) => sum + flight.distanceKm, 0),
  );

  return (
    <main className="app-shell">
      <section className="globe-stage" aria-label="Interactive 3D flight globe">
        {loadState.status === "ready" ? (
          <GlobeView
            flights={flights}
            selectedAirline={selectedAirline}
            selectedYear={selectedYear}
            onHoverFlight={setHoverFlight}
          />
        ) : null}
        {loadState.status === "loading" ? <div className="loading-panel">Loading flights</div> : null}
        {loadState.status === "error" ? (
          <div className="error-panel">
            <AlertTriangle size={18} aria-hidden="true" />
            {loadState.error}
          </div>
        ) : null}
        <a
          className="github-link"
          href="https://github.com/yngyu/flight-map"
          target="_blank"
          rel="noreferrer"
          aria-label="Open flight-map on GitHub"
        >
          <GitHubMark />
        </a>
      </section>

      <aside className="control-panel" aria-label="Flight map controls">
        <div className="brand-row">
          <span className="brand-icon">
            <Plane size={21} aria-hidden="true" />
          </span>
          <div>
            <h1>Flight Map</h1>
            <p>{visibleFlights.length} routes from {loadState.data?.sourceName ?? "CSV"}</p>
          </div>
        </div>

        <div className="stat-grid">
          <div>
            <span>Distance</span>
            <strong>{totalDistanceKm.toLocaleString()} km</strong>
          </div>
          <div>
            <span>Airports</span>
            <strong>{countAirports(visibleFlights)}</strong>
          </div>
        </div>

        <div className="filter-grid">
          <div className="filter-field">
            <label className="field-label" htmlFor="airline-filter">
              Airline
            </label>
            <select
              id="airline-filter"
              className="select-input"
              value={selectedAirline}
              onChange={(event) => setSelectedAirline(event.target.value)}
            >
              {airlines.map((airline) => (
                <option key={airline} value={airline}>
                  {airline}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label className="field-label" htmlFor="year-filter">
              Year
            </label>
            <select
              id="year-filter"
              className="select-input"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="upload-field">
          <label className="field-label" htmlFor="csv-upload">
            CSV
          </label>
          <input
            id="csv-upload"
            className="file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFileChange}
          />
          <label className="file-input-label" htmlFor="csv-upload">
            <FileUp size={17} aria-hidden="true" />
            <span>Load MyFlightradar24 CSV</span>
          </label>
        </div>

        <div className="hint-row">
          <Rotate3D size={17} aria-hidden="true" />
          <span>Drag to rotate. Scroll or pinch to zoom.</span>
        </div>

        <div className="hint-row">
          <Sparkles size={17} aria-hidden="true" />
          <span>Routes use airport coordinates and elevated great-circle arcs.</span>
        </div>

        {hoveredFlight !== null ? (
          <article className="flight-detail">
            <span>{hoveredFlight.date}</span>
            <h2>
              {hoveredFlight.start.code} to {hoveredFlight.destination.code}
            </h2>
            <p>
              {hoveredFlight.start.airport} to {hoveredFlight.destination.airport}
            </p>
            <dl>
              <div>
                <dt>Airline</dt>
                <dd>{hoveredFlight.airline || "Unknown"}</dd>
              </div>
              <div>
                <dt>Aircraft</dt>
                <dd>{hoveredFlight.aircraft || "Unknown"}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{hoveredFlight.duration || "Unknown"}</dd>
              </div>
            </dl>
          </article>
        ) : (
          <article className="flight-detail muted">
            <span>Hover a glowing arc</span>
            <h2>Route details</h2>
            <p>Airport names, aircraft, date, and duration appear here.</p>
          </article>
        )}

        {missingLocations.length > 0 ? (
          <div className="warning-panel">
            <AlertTriangle size={16} aria-hidden="true" />
            Missing coordinates: {missingLocations.join(", ")}
          </div>
        ) : null}

        {lookupWarnings.length > 0 ? (
          <div className="warning-panel">
            <AlertTriangle size={16} aria-hidden="true" />
            {lookupWarnings.join(" ")}
          </div>
        ) : null}
      </aside>
    </main>
  );
}

function GitHubMark(): ReactElement {
  return (
    <svg
      className="github-mark"
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.86c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.02 8.02 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function countAirports(flights: readonly Flight[]): number {
  const codes = new Set<string>();

  flights.forEach((flight) => {
    codes.add(flight.start.code);
    codes.add(flight.destination.code);
  });

  return codes.size;
}
