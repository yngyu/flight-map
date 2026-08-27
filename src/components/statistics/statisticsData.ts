import type { Flight } from "../../lib/flights";
import { countryAtCoordinates } from "../visited-map/visitedMapData";
import type {
  DistanceComparison,
  FlightExtremes,
  TimeConversion,
  UsageItem,
  YearlyFlightCount,
} from "./types";

export function durationInMinutes(duration: string): number {
  const match = /^(\d+):(\d{1,2})/.exec(duration.trim());
  return match === null ? 0 : Number(match[1]) * 60 + Number(match[2]);
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")} h ${minutes.toString().padStart(2, "0")} m`;
}

export function flightTimeConversions(totalMinutes: number): readonly TimeConversion[] {
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

export function findFlightExtremes(
  flights: readonly Flight[],
  metric: (flight: Flight) => number,
): FlightExtremes | null {
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

export function buildCountryUsageStatistics(flights: readonly Flight[]): readonly UsageItem[] {
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

export function buildFlightsByYear(flights: readonly Flight[]): readonly YearlyFlightCount[] {
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

export function buildNamedUsageStatistics(
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

export function buildUsageStatistics(
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
    routes.set(key, { first, second, count: (currentRoute?.count ?? 0) + 1 });
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

export function flightDistanceComparisons(totalDistanceKm: number): readonly DistanceComparison[] {
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

export function formatMultiple(value: number): string {
  return value.toLocaleString(undefined, { maximumSignificantDigits: 3 });
}

export function formatCo2(valueKg: number): string {
  if (valueKg >= 1_000) {
    return `${(valueKg / 1_000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} t`;
  }
  return `${Math.round(valueKg).toLocaleString()} kg`;
}

function compareUsageItems(left: UsageItem, right: UsageItem): number {
  return right.count - left.count || left.label.localeCompare(right.label);
}
