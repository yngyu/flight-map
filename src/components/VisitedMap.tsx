import { useMemo, type ReactElement } from "react";
import type { Flight } from "../lib/flights";
import VisitedMapCanvas from "./VisitedMapCanvas";
import VisitedMapHeader from "./VisitedMapHeader";
import { findVisitedCountries } from "./visitedMapData";

interface VisitedMapProps {
  readonly flights: readonly Flight[];
  readonly sourceName: string;
}

export default function VisitedMap({ flights, sourceName }: VisitedMapProps): ReactElement {
  const visitedCountries = useMemo(() => findVisitedCountries(flights), [flights]);

  return (
    <section
      id="countries-page"
      className="visited-map-page"
      role="tabpanel"
      aria-labelledby="countries-tab"
    >
      <VisitedMapHeader
        sourceName={sourceName}
        visitedCountryCount={visitedCountries.length}
      />
      <VisitedMapCanvas visitedCountries={visitedCountries} />
    </section>
  );
}
