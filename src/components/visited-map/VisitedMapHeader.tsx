import type { ReactElement } from "react";

interface VisitedMapHeaderProps {
  readonly sourceName: string;
  readonly visitedCountryCount: number;
}

export default function VisitedMapHeader({
  sourceName,
  visitedCountryCount,
}: VisitedMapHeaderProps): ReactElement {
  return (
    <header className="visited-map-header">
      <div>
        <span className="page-eyebrow">Travel footprint</span>
        <h2>Countries Visited</h2>
        <p>{sourceName}</p>
      </div>
      <div
        className="visited-country-count"
        aria-label={`${visitedCountryCount} countries visited`}
      >
        <strong>{visitedCountryCount}</strong>
        <span>countries visited</span>
      </div>
    </header>
  );
}
