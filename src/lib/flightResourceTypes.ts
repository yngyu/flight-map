import type { AirportLocation } from "../data/airports.js";

export interface FlightResourcesRequest {
  readonly airportCodes: readonly string[];
  readonly airlines: readonly string[];
}

export interface FlightResourcesResponse {
  readonly locationsByCode: Readonly<Record<string, AirportLocation>>;
  readonly colorsByAirline: Readonly<Record<string, string>>;
  readonly warnings: readonly string[];
}
