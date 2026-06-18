import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  TubeGeometry,
  Vector3,
} from "three";
import type { AirportLocation } from "../data/airports";
import countriesTopologyJson from "../data/countries-110m.json";
import type { Flight } from "./flights";

export interface RouteMeshGroup {
  readonly line: Mesh;
  readonly glow: Mesh;
  readonly traveler: Mesh<SphereGeometry, MeshBasicMaterial>;
  readonly curve: QuadraticBezierCurve3;
  readonly travelDurationSeconds: number;
  readonly travelOffsetSeconds: number;
  readonly startMarker: Sprite;
  readonly destinationMarker: Sprite;
}

const globeRadius = 2;
const mapLineRadius = globeRadius * 1.007;
const travelerSpeedKmPerSecond = 260;

export function createEarthMesh(): Mesh {
  const texture = new TextureLoader().load("/earth-night.jpg");
  texture.colorSpace = SRGBColorSpace;

  return new Mesh(
    new SphereGeometry(globeRadius, 96, 96),
    new MeshBasicMaterial({
      color: new Color("#cfe9ff"),
      map: texture,
    }),
  );
}

export function createAtmosphereMesh(): Mesh {
  return new Mesh(
    new SphereGeometry(globeRadius * 1.035, 96, 96),
    new MeshBasicMaterial({
      color: new Color("#3478a8"),
      transparent: true,
      opacity: 0.14,
      side: BackSide,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
}

export function createStars(): Points {
  const positions: number[] = [];

  for (let index = 0; index < 1200; index += 1) {
    const point = randomPointOnSphere(22 + Math.random() * 9);
    positions.push(point.x, point.y, point.z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

  return new Points(
    geometry,
    new PointsMaterial({
      color: "#8eb9ff",
      transparent: true,
      opacity: 0.36,
      size: 0.022,
      sizeAttenuation: true,
    }),
  );
}

export function createMapLineMesh(): LineSegments<BufferGeometry, LineBasicMaterial> {
  const positions: number[] = [];

  buildCountryBoundaryPaths().forEach((path) => addPathSegments(path, positions));

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

  return new LineSegments(
    geometry,
    new LineBasicMaterial({
      color: "#b9d8e6",
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
}

export function createRouteMeshes(flight: Flight): RouteMeshGroup {
  const routeColor = flight.routeColor;
  const curve = calculateRouteCurve(flight.start, flight.destination);
  const routeGeometry = new TubeGeometry(curve, 72, 0.0038, 8, false);
  const glowGeometry = new TubeGeometry(curve, 72, 0.011, 8, false);
  const travelDurationSeconds = flight.distanceKm / travelerSpeedKmPerSecond;

  const line = new Mesh(
    routeGeometry,
    new MeshBasicMaterial({
      color: routeColor,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );

  const glow = new Mesh(
    glowGeometry,
    new MeshBasicMaterial({
      color: routeColor,
      transparent: true,
      opacity: 0.09,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );

  return {
    line,
    glow,
    traveler: createTraveler(routeColor),
    curve,
    travelDurationSeconds,
    travelOffsetSeconds: calculateTravelOffsetSeconds(flight, travelDurationSeconds),
    startMarker: createAirportMarker(flight.start, routeColor, 0.036),
    destinationMarker: createAirportMarker(flight.destination, "#ffffff", 0.029),
  };
}

export function latLonToVector3(lat: number, lon: number, radius: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new Vector3(x, y, z);
}

function calculateRouteCurve(
  start: AirportLocation,
  destination: AirportLocation,
): QuadraticBezierCurve3 {
  const startPoint = latLonToVector3(start.lat, start.lon, globeRadius * 1.018);
  const destinationPoint = latLonToVector3(destination.lat, destination.lon, globeRadius * 1.018);
  const distanceFactor = Math.min(startPoint.angleTo(destinationPoint) / Math.PI, 1);
  const midpoint = startPoint.clone().add(destinationPoint).normalize();
  const altitude = globeRadius * (1.12 + distanceFactor * 0.62);
  const controlPoint = midpoint.multiplyScalar(altitude);

  return new QuadraticBezierCurve3(startPoint, controlPoint, destinationPoint);
}

function createAirportMarker(location: AirportLocation, color: string, size: number): Sprite {
  const marker = new Sprite(
    new SpriteMaterial({
      map: createMarkerTexture(color),
      color,
      transparent: true,
      opacity: 0.74,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const point = latLonToVector3(location.lat, location.lon, globeRadius * 1.026);
  marker.position.copy(point);
  marker.scale.set(size, size, size);

  return marker;
}

function createTraveler(color: string): Mesh<SphereGeometry, MeshBasicMaterial> {
  return new Mesh(
    new SphereGeometry(0.014, 12, 12),
    new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
}

function calculateTravelOffsetSeconds(flight: Flight, travelDurationSeconds: number): number {
  const sortedCodes = [flight.start.code, flight.destination.code].sort();
  const pairKey = sortedCodes.join("-");
  let hash = 0;

  for (let index = 0; index < pairKey.length; index += 1) {
    hash = (hash * 31 + pairKey.charCodeAt(index)) % 997;
  }

  return (hash / 997) * travelDurationSeconds;
}

function createMarkerTexture(color: string): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");

  if (context !== null) {
    const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 44);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.26, color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(48, 48, 44, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = "srgb";

  return texture;
}

function addPathSegments(path: GeoPath, positions: number[]): void {
  for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex += 1) {
    const start = path[pathIndex];
    const end = path[pathIndex + 1];

    if (start === undefined || end === undefined) {
      continue;
    }

    const steps = getSegmentSteps(start, end);
    let previousPoint = latLonToVector3(start[1], start[0], mapLineRadius);

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const lon = interpolateLongitude(start[0], end[0], progress);
      const lat = start[1] + (end[1] - start[1]) * progress;
      const nextPoint = latLonToVector3(lat, lon, mapLineRadius);
      positions.push(
        previousPoint.x,
        previousPoint.y,
        previousPoint.z,
        nextPoint.x,
        nextPoint.y,
        nextPoint.z,
      );
      previousPoint = nextPoint;
    }
  }
}

function getSegmentSteps(start: GeoCoordinate, end: GeoCoordinate): number {
  const deltaLon = Math.abs(getLongitudeDelta(start[0], end[0]));
  const deltaLat = Math.abs(end[1] - start[1]);

  return Math.max(2, Math.ceil(Math.max(deltaLon, deltaLat) / 3.5));
}

function interpolateLongitude(startLon: number, endLon: number, progress: number): number {
  return normalizeLongitude(startLon + getLongitudeDelta(startLon, endLon) * progress);
}

function getLongitudeDelta(startLon: number, endLon: number): number {
  const deltaLon = endLon - startLon;

  if (deltaLon > 180) {
    return deltaLon - 360;
  }

  if (deltaLon < -180) {
    return deltaLon + 360;
  }

  return deltaLon;
}

function normalizeLongitude(lon: number): number {
  if (lon > 180) {
    return lon - 360;
  }

  if (lon < -180) {
    return lon + 360;
  }

  return lon;
}

function randomPointOnSphere(radius: number): Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);

  return new Vector3(x, y, z);
}

type GeoCoordinate = readonly [lon: number, lat: number];
type GeoPath = readonly GeoCoordinate[];

interface Topology {
  readonly transform: {
    readonly scale: readonly [number, number];
    readonly translate: readonly [number, number];
  };
  readonly arcs: readonly (readonly TopologyPoint[])[];
  readonly objects: {
    readonly countries: {
      readonly geometries: readonly CountryGeometry[];
    };
  };
}

interface TopologyPoint {
  readonly 0: number;
  readonly 1: number;
}

interface TopoPolygonGeometry {
  readonly type: "Polygon";
  readonly arcs: readonly TopologyRing[];
}

interface TopoMultiPolygonGeometry {
  readonly type: "MultiPolygon";
  readonly arcs: readonly (readonly TopologyRing[])[];
}

type CountryGeometry = TopoPolygonGeometry | TopoMultiPolygonGeometry;
type TopologyRing = readonly number[];

const countriesTopology = parseTopology(countriesTopologyJson);

function buildCountryBoundaryPaths(): readonly GeoPath[] {
  return countriesTopology.objects.countries.geometries.flatMap((geometry) => {
    if (geometry.type === "Polygon") {
      return geometry.arcs.map(decodeRing);
    }

    return geometry.arcs.flatMap((polygon) => polygon.map(decodeRing));
  });
}

function decodeRing(ring: TopologyRing): GeoPath {
  return ring.flatMap(decodeArcReference);
}

function decodeArcReference(arcReference: number): GeoPath {
  const arcIndex = arcReference >= 0 ? arcReference : ~arcReference;
  const arc = countriesTopology.arcs[arcIndex];

  if (arc === undefined) {
    return [];
  }

  const coordinates = decodeArc(arc);

  if (arcReference < 0) {
    return [...coordinates].reverse();
  }

  return coordinates;
}

function decodeArc(arc: readonly TopologyPoint[]): GeoPath {
  let x = 0;
  let y = 0;

  return arc.map((point) => {
    x += point[0];
    y += point[1];

    return [
      x * countriesTopology.transform.scale[0] + countriesTopology.transform.translate[0],
      y * countriesTopology.transform.scale[1] + countriesTopology.transform.translate[1],
    ];
  });
}

function parseTopology(value: unknown): Topology {
  const topology = getRecord(value, "countries topology");
  const transform = getRecord(topology.transform, "topology transform");
  const objects = getRecord(topology.objects, "topology objects");
  const countries = getRecord(objects.countries, "countries object");

  return {
    transform: {
      scale: getNumberPair(transform.scale, "topology transform scale"),
      translate: getNumberPair(transform.translate, "topology transform translate"),
    },
    arcs: getArcs(topology.arcs),
    objects: {
      countries: {
        geometries: getCountryGeometries(countries.geometries),
      },
    },
  };
}

function getCountryGeometries(value: unknown): readonly CountryGeometry[] {
  const geometries: CountryGeometry[] = [];

  getArray(value, "country geometries").forEach((geometryValue) => {
    const geometry = getRecord(geometryValue, "country geometry");

    if (geometry.type === "Polygon") {
      geometries.push({
        type: "Polygon",
        arcs: getPolygonRings(geometry.arcs),
      });
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometries.push({
        type: "MultiPolygon",
        arcs: getArray(geometry.arcs, "multipolygon arcs").map(getPolygonRings),
      });
    }
  });

  return geometries;
}

function getPolygonRings(value: unknown): readonly TopologyRing[] {
  return getArray(value, "polygon rings").map(getTopologyRing);
}

function getTopologyRing(value: unknown): TopologyRing {
  return getArray(value, "topology ring").map((arcReference) => {
    if (typeof arcReference !== "number") {
      throw new Error("Topology ring contains a non-number arc reference.");
    }

    return arcReference;
  });
}

function getArcs(value: unknown): readonly (readonly TopologyPoint[])[] {
  return getArray(value, "topology arcs").map((arc) =>
    getArray(arc, "topology arc").map((point) => getNumberPair(point, "topology point")),
  );
}

function getNumberPair(value: unknown, label: string): readonly [number, number] {
  const array = getArray(value, label);
  const first = array[0];
  const second = array[1];

  if (typeof first !== "number" || typeof second !== "number") {
    throw new Error(`${label} must be a numeric pair.`);
  }

  return [first, second];
}

function getArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

function getRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}
