import type { FlightResourcesRequest, FlightResourcesResponse } from "./flightResourceTypes";

export interface FlightResourceClient {
  resolveFlightResources(request: FlightResourcesRequest): Promise<FlightResourcesResponse>;
}

class ApiFlightResourceClient implements FlightResourceClient {
  async resolveFlightResources(request: FlightResourcesRequest): Promise<FlightResourcesResponse> {
    const response = await fetch("/api/flight-resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to load flight resources: ${response.status}`);
    }

    const body: unknown = await response.json();

    if (!isFlightResourcesResponse(body)) {
      throw new Error("Flight resource API returned an invalid response.");
    }

    return body;
  }
}

export const flightResourceClient: FlightResourceClient = new ApiFlightResourceClient();

function isFlightResourcesResponse(value: unknown): value is FlightResourcesResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.locationsByCode) &&
    isRecord(value.colorsByAirline) &&
    isStringArray(value.warnings)
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
