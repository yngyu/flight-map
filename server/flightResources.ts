import { knownAirlineColors } from "../src/data/airlineColors.js";
import { airportLocations, type AirportLocation } from "../src/data/airports.js";
import { parseCsv } from "../src/lib/csv.js";
import type { FlightResourcesRequest, FlightResourcesResponse } from "../src/lib/flightResourceTypes.js";

const ourAirportsUrl = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const knownAirportLocationsByCode = createKnownAirportLocationsByCode();
let ourAirportsCachePromise: Promise<Readonly<Record<string, AirportLocation>>> | null = null;

export async function resolveFlightResources(
  request: FlightResourcesRequest,
): Promise<FlightResourcesResponse> {
  const airportLookup = await resolveAirportLocations(request.airportCodes);

  return {
    locationsByCode: airportLookup.locationsByCode,
    colorsByAirline: resolveAirlineColors(request.airlines),
    warnings: airportLookup.warnings,
  };
}

interface AirportLookupResult {
  readonly locationsByCode: Readonly<Record<string, AirportLocation>>;
  readonly warnings: readonly string[];
}

async function resolveAirportLocations(codes: readonly string[]): Promise<AirportLookupResult> {
  const uniqueCodes = normalizeCodes(codes);
  const locationsByCode: Record<string, AirportLocation> = {};
  const missingCodes: string[] = [];

  uniqueCodes.forEach((code) => {
    const knownLocation = knownAirportLocationsByCode[code];

    if (knownLocation === undefined) {
      missingCodes.push(code);
    } else {
      locationsByCode[code] = knownLocation;
    }
  });

  if (missingCodes.length === 0) {
    return { locationsByCode, warnings: [] };
  }

  const externalLookup = await loadOurAirportsByCode();

  if (externalLookup.status === "error") {
    return {
      locationsByCode,
      warnings: [`Airport lookup unavailable: ${externalLookup.message}`],
    };
  }

  const stillMissingCodes: string[] = [];

  missingCodes.forEach((code) => {
    const externalLocation = externalLookup.locationsByCode[code];

    if (externalLocation === undefined) {
      stillMissingCodes.push(code);
    } else {
      locationsByCode[code] = externalLocation;
    }
  });

  return {
    locationsByCode,
    warnings:
      stillMissingCodes.length > 0
        ? [`Airport lookup missing IATA: ${stillMissingCodes.join(", ")}`]
        : [],
  };
}

function resolveAirlineColors(airlines: readonly string[]): Readonly<Record<string, string>> {
  const colorsByAirline: Record<string, string> = {};

  normalizeAirlines(airlines).forEach((airline) => {
    const knownColor = knownAirlineColors[normalizeAirlineName(airline)];
    colorsByAirline[airline] = knownColor ?? fallbackColorForAirline(airline);
  });

  return colorsByAirline;
}

type OurAirportsLookupResult =
  | {
      readonly status: "ready";
      readonly locationsByCode: Readonly<Record<string, AirportLocation>>;
    }
  | {
      readonly status: "error";
      readonly message: string;
    };

async function loadOurAirportsByCode(): Promise<OurAirportsLookupResult> {
  try {
    if (ourAirportsCachePromise === null) {
      ourAirportsCachePromise = fetchOurAirportsByCode();
    }

    return {
      status: "ready",
      locationsByCode: await ourAirportsCachePromise,
    };
  } catch (error: unknown) {
    ourAirportsCachePromise = null;

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown airport lookup error",
    };
  }
}

async function fetchOurAirportsByCode(): Promise<Readonly<Record<string, AirportLocation>>> {
  const response = await fetch(ourAirportsUrl);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const table = parseCsv(await response.text());
  const locationsByCode: Record<string, AirportLocation> = {};

  table.rows.forEach((row) => {
    const code = getValue(row, "iata_code").toUpperCase();
    const name = getValue(row, "name");
    const lat = Number(getValue(row, "latitude_deg"));
    const lon = Number(getValue(row, "longitude_deg"));

    if (
      code.length !== 3 ||
      name.length === 0 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      locationsByCode[code] !== undefined
    ) {
      return;
    }

    locationsByCode[code] = {
      label: name,
      airport: name,
      code,
      lat,
      lon,
    };
  });

  return locationsByCode;
}

function createKnownAirportLocationsByCode(): Readonly<Record<string, AirportLocation>> {
  const locationsByCode: Record<string, AirportLocation> = {};

  Object.values(airportLocations).forEach((location) => {
    locationsByCode[location.code] = location;
  });

  return locationsByCode;
}

function normalizeCodes(codes: readonly string[]): readonly string[] {
  const uniqueCodes = new Set<string>();

  codes.forEach((code) => {
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length === 3) {
      uniqueCodes.add(normalizedCode);
    }
  });

  return Array.from(uniqueCodes).sort();
}

function normalizeAirlines(airlines: readonly string[]): readonly string[] {
  const uniqueAirlines = new Set<string>();

  airlines.forEach((airline) => {
    const normalizedAirline = airline.trim();

    if (normalizedAirline.length > 0) {
      uniqueAirlines.add(normalizedAirline);
    }
  });

  return Array.from(uniqueAirlines).sort();
}

function normalizeAirlineName(airline: string): string {
  return airline.trim().toLowerCase();
}

function fallbackColorForAirline(airline: string): string {
  const hue = hashString(airline) % 360;

  return hslToHex(hue, 68, 62);
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = l - chroma / 2;
  const channel = hslChannelToRgb(huePrime, chroma, x, match);

  return `#${toHex(channel.red)}${toHex(channel.green)}${toHex(channel.blue)}`;
}

function hslChannelToRgb(
  huePrime: number,
  chroma: number,
  x: number,
  match: number,
): { readonly red: number; readonly green: number; readonly blue: number } {
  if (huePrime < 1) {
    return toRgb(chroma, x, 0, match);
  }

  if (huePrime < 2) {
    return toRgb(x, chroma, 0, match);
  }

  if (huePrime < 3) {
    return toRgb(0, chroma, x, match);
  }

  if (huePrime < 4) {
    return toRgb(0, x, chroma, match);
  }

  if (huePrime < 5) {
    return toRgb(x, 0, chroma, match);
  }

  return toRgb(chroma, 0, x, match);
}

function toRgb(
  red: number,
  green: number,
  blue: number,
  match: number,
): { readonly red: number; readonly green: number; readonly blue: number } {
  return {
    red: Math.round((red + match) * 255),
    green: Math.round((green + match) * 255),
    blue: Math.round((blue + match) * 255),
  };
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function getValue(row: Readonly<Record<string, string>>, name: string): string {
  return row[name]?.trim() ?? "";
}
