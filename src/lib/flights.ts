import { airportLocations, type AirportLocation } from "../data/airports";
import { parseCsv, type CsvTable } from "./csv";
import { flightResourceClient } from "./flightResourceClient";

export interface Flight {
  readonly id: string;
  readonly date: string;
  readonly year: string;
  readonly startName: string;
  readonly destinationName: string;
  readonly start: AirportLocation;
  readonly destination: AirportLocation;
  readonly airline: string;
  readonly routeColor: string;
  readonly aircraft: string;
  readonly reason: string;
  readonly cabinClass: string;
  readonly seatNumber: string;
  readonly duration: string;
  readonly distanceKm: number;
}

export interface FlightLoadResult {
  readonly flights: readonly Flight[];
  readonly missingLocations: readonly string[];
  readonly lookupWarnings: readonly string[];
  readonly sourceName: string;
}

interface AirportReference {
  readonly label: string;
  readonly code: string;
}

interface NormalizedFlightRow {
  readonly idParts: readonly string[];
  readonly date: string;
  readonly start: AirportReference;
  readonly destination: AirportReference;
  readonly airline: string;
  readonly aircraft: string;
  readonly reason: string;
  readonly cabinClass: string;
  readonly seatNumber: string;
  readonly duration: string;
}

const defaultSourceName = "flightdiary_example.csv";
const earthRadiusKm = 6371;
const fallbackRouteColor = "#5eead4";

export async function loadDefaultFlights(): Promise<FlightLoadResult> {
  const response = await fetch(`/${defaultSourceName}`);

  if (!response.ok) {
    throw new Error(`Failed to load ${defaultSourceName}: ${response.status}`);
  }

  return loadFlightsFromCsvText(await response.text(), defaultSourceName);
}

export async function loadFlightsFromCsvText(
  input: string,
  sourceName: string,
): Promise<FlightLoadResult> {
  return normalizeFlights(parseCsv(input), sourceName);
}

async function normalizeFlights(table: CsvTable, sourceName: string): Promise<FlightLoadResult> {
  const missingLocationSet = new Set<string>();
  const flights: Flight[] = [];
  const rows = toNormalizedRows(table);
  const resources = await flightResourceClient.resolveFlightResources({
    airportCodes: airportCodes(rows),
    airlines: rows.map((row) => row.airline),
  });

  rows.forEach((row, index) => {
    const start = resolveAirport(row.start, resources.locationsByCode);
    const destination = resolveAirport(row.destination, resources.locationsByCode);

    if (start === undefined) {
      missingLocationSet.add(missingLocationLabel(row.start));
    }

    if (destination === undefined) {
      missingLocationSet.add(missingLocationLabel(row.destination));
    }

    if (start === undefined || destination === undefined) {
      return;
    }

    flights.push({
      id: `${index}-${row.idParts.join("-")}`,
      date: row.date,
      year: extractYear(row.date),
      startName: row.start.label,
      destinationName: row.destination.label,
      start,
      destination,
      airline: row.airline,
      routeColor: resources.colorsByAirline[row.airline] ?? fallbackRouteColor,
      aircraft: row.aircraft,
      reason: row.reason,
      cabinClass: row.cabinClass,
      seatNumber: row.seatNumber,
      duration: row.duration,
      distanceKm: calculateDistanceKm(start, destination),
    });
  });

  return {
    flights,
    missingLocations: Array.from(missingLocationSet).sort(),
    lookupWarnings: resources.warnings,
    sourceName,
  };
}

function toNormalizedRows(table: CsvTable): readonly NormalizedFlightRow[] {
  if (hasHeaders(table.headers, ["Date", "Start", "Destination"])) {
    return table.rows.map(toMyFlightsRow);
  }

  if (hasHeaders(table.headers, ["Date", "From", "To"])) {
    return table.rows.map(toFlightDiaryRow);
  }

  throw new Error(`Unsupported CSV format: ${table.headers.join(", ")}`);
}

function toMyFlightsRow(row: Readonly<Record<string, string>>): NormalizedFlightRow {
  const date = getValue(row, "Date");
  const start = textAirportReference(getValue(row, "Start"));
  const destination = textAirportReference(getValue(row, "Destination"));

  return {
    idParts: [date, start.label, destination.label],
    date,
    start,
    destination,
    airline: getValue(row, "Airline"),
    aircraft: cleanText(getValue(row, "Aircraft")),
    reason: getValue(row, "Reason"),
    cabinClass: getValue(row, "Class"),
    seatNumber: getValue(row, "Seat Number"),
    duration: getValue(row, "Duration"),
  };
}

function toFlightDiaryRow(row: Readonly<Record<string, string>>): NormalizedFlightRow {
  const date = getValue(row, "Date");
  const start = codedAirportReference(getValue(row, "From"));
  const destination = codedAirportReference(getValue(row, "To"));

  return {
    idParts: [date, getValue(row, "Flight number"), start.code, destination.code],
    date,
    start,
    destination,
    airline: trimTrailingParentheses(getValue(row, "Airline")),
    aircraft: cleanText(trimTrailingParentheses(getValue(row, "Aircraft"))),
    reason: getValue(row, "Flight reason"),
    cabinClass: getValue(row, "Flight class"),
    seatNumber: getValue(row, "Seat number", "Seat Number"),
    duration: normalizeDuration(getValue(row, "Duration")),
  };
}

function hasHeaders(headers: readonly string[], requiredHeaders: readonly string[]): boolean {
  const headerSet = new Set(headers.map(normalizeHeader));

  return requiredHeaders.every((header) => headerSet.has(normalizeHeader(header)));
}

function getValue(row: Readonly<Record<string, string>>, ...names: readonly string[]): string {
  for (const name of names) {
    const value = row[name];

    if (value !== undefined) {
      return cleanText(value);
    }
  }

  return "";
}

function textAirportReference(value: string): AirportReference {
  return {
    label: value,
    code: "",
  };
}

function codedAirportReference(value: string): AirportReference {
  const codeMatch = /\(([A-Z0-9]{3})\/[A-Z0-9]{4}\)/.exec(value) ?? /\b([A-Z]{3})\b/.exec(value);
  const label = value.replace(/\s*\([^)]*\)\s*$/, "").trim();

  return {
    label: label.length > 0 ? label : value,
    code: codeMatch?.[1] ?? "",
  };
}

function resolveAirport(
  reference: AirportReference,
  airportLocationsByCode: Readonly<Record<string, AirportLocation>>,
): AirportLocation | undefined {
  if (reference.code.length > 0) {
    const airportByCode = airportLocationsByCode[reference.code.toUpperCase()];

    if (airportByCode !== undefined) {
      return airportByCode;
    }
  }

  return airportLocations[reference.label];
}

function airportCodes(rows: readonly NormalizedFlightRow[]): readonly string[] {
  return rows.flatMap((row) => [row.start.code, row.destination.code]);
}

function missingLocationLabel(reference: AirportReference): string {
  if (reference.code.length > 0) {
    return `${reference.label} (${reference.code})`;
  }

  return reference.label;
}

function extractYear(date: string): string {
  const yearMatch = /^(\d{4})/.exec(date) ?? /(\d{4})$/.exec(date);

  return yearMatch?.[1] ?? "Unknown";
}

function normalizeDuration(value: string): string {
  const parts = value.split(":");

  if (parts.length === 3) {
    return `${parts[0]}:${parts[1]}`;
  }

  return value;
}

function trimTrailingParentheses(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function cleanText(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "null" || trimmed === "()" || trimmed === "(/)") {
    return "";
  }

  return trimmed;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function calculateDistanceKm(start: AirportLocation, destination: AirportLocation): number {
  const startLat = degreesToRadians(start.lat);
  const destinationLat = degreesToRadians(destination.lat);
  const deltaLat = degreesToRadians(destination.lat - start.lat);
  const deltaLon = degreesToRadians(destination.lon - start.lon);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) *
      Math.cos(destinationLat) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
