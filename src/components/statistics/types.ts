import type { Flight } from "../../lib/flights";

export interface UsageItem {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly displayValue?: string;
}

export type UsageCategory =
  | "airports"
  | "routes"
  | "countries"
  | "airlines-count"
  | "airlines-distance"
  | "aircraft-count"
  | "aircraft-distance";

export interface YearlyFlightCount {
  readonly year: string;
  readonly count: number;
}

export interface TimeConversion {
  readonly label: string;
  readonly value: string;
}

export interface DistanceComparison {
  readonly icon: "earth" | "moon" | "sun";
  readonly label: string;
  readonly multiple: number;
  readonly progress: number;
  readonly fractionalProgress: number | null;
}

export interface FlightExtremes {
  readonly longest: Flight;
  readonly shortest: Flight;
}
