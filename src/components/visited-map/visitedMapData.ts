import { geoContains, geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countriesTopologyJson from "../../data/countries-110m.json";
import type { Flight } from "../../lib/flights";

interface CountryProperties {
  readonly name?: string;
}

export interface MapTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

export const mapWidth = 1200;
export const mapHeight = 620;
export const minimumScale = 1.12;
export const maximumScale = 8;

const topology = countriesTopologyJson as unknown as Parameters<typeof feature>[0];
const countriesObject = topology.objects.countries as Parameters<typeof feature>[1];
const countryCollection = feature(topology, countriesObject) as unknown as GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  CountryProperties
>;

export const countries = countryCollection.features;
export type CountryFeature = (typeof countries)[number];

export const projection = geoEquirectangular().fitExtent(
  [
    [24, 24],
    [mapWidth - 24, mapHeight - 24],
  ],
  countryCollection,
);
export const mapPath = geoPath(projection);

const [[, mapTop], [, mapBottom]] = mapPath.bounds(countryCollection);
const westEdge = projection([-180, 0]);
const eastEdge = projection([180, 0]);
const worldWidth =
  westEdge === null || eastEdge === null ? mapWidth - 48 : eastEdge[0] - westEdge[0];

export const initialTransform = centeredTransform(minimumScale);
export const mapCopyOffsets = [-worldWidth, 0, worldWidth] as const;

const countryLabelAbbreviations: Readonly<Record<string, string>> = {
  "Central African Rep.": "CAR",
  "Dem. Rep. Congo": "DR Congo",
  "United Arab Emirates": "UAE",
  "United Kingdom": "UK",
  "United States of America": "USA",
};

const countryLabelCoordinates: Readonly<Record<string, [number, number]>> = {
  France: [2.2137, 46.2276],
};

export function findVisitedCountries(flights: readonly Flight[]): readonly CountryFeature[] {
  const airportPoints = flights.flatMap((flight) => [
    [flight.start.lon, flight.start.lat] as [number, number],
    [flight.destination.lon, flight.destination.lat] as [number, number],
  ]);

  return countries.filter((country) =>
    airportPoints.some((coordinates) => geoContains(country, coordinates)),
  );
}

export function countryName(country: CountryFeature): string {
  return country.properties?.name ?? "Unknown country";
}

export function countryAtCoordinates(lon: number, lat: number): string | undefined {
  const country = countries.find((candidate) => geoContains(candidate, [lon, lat]));

  return country === undefined ? undefined : countryName(country);
}

export function countryLabel(name: string): string {
  return countryLabelAbbreviations[name] ?? name;
}

export function countryLabelPoint(
  country: CountryFeature,
  name: string,
): readonly [number, number] {
  const coordinates = countryLabelCoordinates[name];

  if (coordinates !== undefined) {
    const projectedPoint = projection(coordinates);

    if (projectedPoint !== null) {
      return projectedPoint;
    }
  }

  return mapPath.centroid(country);
}

export function centeredTransform(scale: number): MapTransform {
  return {
    scale,
    x: (mapWidth / 2) * (1 - scale),
    y: (mapHeight / 2) * (1 - scale),
  };
}

export function wrapHorizontalPosition(x: number, scale: number): number {
  const centeredX = centeredTransform(scale).x;
  const period = worldWidth * scale;
  const offset = x - centeredX;
  const wrappedOffset = (((offset + period / 2) % period) + period) % period - period / 2;

  return centeredX + wrappedOffset;
}

export function clampVerticalPosition(y: number, scale: number): number {
  if (scale === minimumScale) {
    return initialTransform.y;
  }

  const northernLimit = -mapTop * scale;
  const southernLimit = mapHeight - mapBottom * scale;

  if (southernLimit > northernLimit) {
    return mapHeight / 2 - ((mapTop + mapBottom) / 2) * scale;
  }

  return Math.min(northernLimit, Math.max(southernLimit, y));
}

export function clientToMapPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): MapPoint {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const screenMatrix = svg.getScreenCTM();

  if (screenMatrix === null) {
    return { x: mapWidth / 2, y: mapHeight / 2 };
  }

  const transformedPoint = point.matrixTransform(screenMatrix.inverse());
  return { x: transformedPoint.x, y: transformedPoint.y };
}
