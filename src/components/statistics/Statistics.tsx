import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Flight } from "../../lib/flights";
import FlightComparisons from "./FlightComparisons";
import FlightExtremes from "./FlightExtremes";
import SummaryCards from "./SummaryCards";
import UsageSections from "./UsageSections";
import { UsageDialog } from "./UsageRanking";
import {
  buildCountryUsageStatistics,
  buildFlightsByYear,
  buildNamedUsageStatistics,
  buildUsageStatistics,
  durationInMinutes,
  findFlightExtremes,
  flightDistanceComparisons,
  flightTimeConversions,
} from "./statisticsData";
import type { UsageCategory, UsageItem } from "./types";

interface StatisticsProps {
  readonly flights: readonly Flight[];
  readonly sourceName: string;
}

interface UsageView {
  readonly title: string;
  readonly items: readonly UsageItem[];
}

const co2KgPerPassengerKm = 0.115;

export default function Statistics({ flights, sourceName }: StatisticsProps): ReactElement {
  const [expandedUsage, setExpandedUsage] = useState<UsageCategory | null>(null);
  const statistics = useMemo(() => calculateStatistics(flights), [flights]);
  const usageViews: Record<UsageCategory, UsageView> = {
    airports: { title: "Most used airports", items: statistics.airportUsage },
    routes: { title: "Most used routes", items: statistics.routeUsage },
    countries: { title: "Most visited countries", items: statistics.countryUsage },
    "airlines-count": { title: "Most used airlines", items: statistics.airlineUsage.byCount },
    "airlines-distance": {
      title: "Airlines by distance",
      items: statistics.airlineUsage.byDistance,
    },
    "aircraft-count": { title: "Most used aircraft", items: statistics.aircraftUsage.byCount },
    "aircraft-distance": {
      title: "Aircraft by distance",
      items: statistics.aircraftUsage.byDistance,
    },
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

      <SummaryCards
        flightCount={flights.length}
        totalFlightMinutes={statistics.totalFlightMinutes}
        totalDistanceKm={statistics.totalDistanceKm}
        totalCo2Kg={statistics.totalCo2Kg}
      />
      <FlightComparisons
        totalFlightMinutes={statistics.totalFlightMinutes}
        totalDistanceKm={statistics.totalDistanceKm}
        timeConversions={statistics.timeConversions}
        distanceComparisons={statistics.distanceComparisons}
      />
      <FlightExtremes
        distance={statistics.distanceExtremes}
        duration={statistics.durationExtremes}
      />
      <UsageSections
        airports={statistics.airportUsage}
        routes={statistics.routeUsage}
        airlineCount={statistics.airlineUsage.byCount}
        airlineDistance={statistics.airlineUsage.byDistance}
        aircraftCount={statistics.aircraftUsage.byCount}
        aircraftDistance={statistics.aircraftUsage.byDistance}
        countries={statistics.countryUsage}
        flightsByYear={statistics.flightsByYear}
        onExpand={setExpandedUsage}
      />

      {expandedUsage !== null ? (
        <UsageDialog
          title={usageViews[expandedUsage].title}
          items={usageViews[expandedUsage].items}
          onClose={() => setExpandedUsage(null)}
        />
      ) : null}
    </section>
  );
}

function calculateStatistics(flights: readonly Flight[]) {
  const totalDistanceKm = flights.reduce((total, flight) => total + flight.distanceKm, 0);
  const totalFlightMinutes = flights.reduce(
    (total, flight) => total + durationInMinutes(flight.duration),
    0,
  );
  const { airports: airportUsage, routes: routeUsage } = buildUsageStatistics(flights);

  return {
    totalDistanceKm,
    totalFlightMinutes,
    totalCo2Kg: totalDistanceKm * co2KgPerPassengerKm,
    timeConversions: flightTimeConversions(totalFlightMinutes),
    distanceComparisons: flightDistanceComparisons(totalDistanceKm),
    distanceExtremes: findFlightExtremes(flights, (flight) => flight.distanceKm),
    durationExtremes: findFlightExtremes(flights, (flight) =>
      durationInMinutes(flight.duration),
    ),
    airportUsage,
    routeUsage,
    airlineUsage: buildNamedUsageStatistics(flights, (flight) => flight.airline || "Unknown"),
    aircraftUsage: buildNamedUsageStatistics(flights, (flight) => flight.aircraft || "Unknown"),
    countryUsage: buildCountryUsageStatistics(flights),
    flightsByYear: buildFlightsByYear(flights),
  };
}
