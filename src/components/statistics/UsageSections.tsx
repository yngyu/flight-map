import { Globe2, Plane, TowerControl } from "lucide-react";
import type { ReactElement } from "react";
import { AircraftSideIcon, TailFinIcon } from "./UsageIcons";
import { UsageCard } from "./UsageRanking";
import YearlyFlightsChart from "./YearlyFlightsChart";
import type { UsageCategory, UsageItem, YearlyFlightCount } from "./types";

interface UsageSectionsProps {
  readonly airports: readonly UsageItem[];
  readonly routes: readonly UsageItem[];
  readonly airlineCount: readonly UsageItem[];
  readonly airlineDistance: readonly UsageItem[];
  readonly aircraftCount: readonly UsageItem[];
  readonly aircraftDistance: readonly UsageItem[];
  readonly countries: readonly UsageItem[];
  readonly flightsByYear: readonly YearlyFlightCount[];
  readonly onExpand: (category: UsageCategory) => void;
}

export default function UsageSections(props: UsageSectionsProps): ReactElement {
  return (
    <>
      <div className="statistics-usage">
        <UsageCard
          icon={<TowerControl size={22} />}
          title="Most used airports"
          items={props.airports}
          onExpand={() => props.onExpand("airports")}
        />
        <UsageCard
          icon={<Plane size={22} />}
          title="Most used routes"
          items={props.routes}
          onExpand={() => props.onExpand("routes")}
        />
      </div>
      <div className="statistics-usage">
        <UsageCard
          icon={<TailFinIcon />}
          title="Most used airlines"
          items={props.airlineCount}
          onExpand={() => props.onExpand("airlines-count")}
        />
        <UsageCard
          icon={<TailFinIcon />}
          eyebrow="Top 5 · distance"
          title="Airlines by distance"
          items={props.airlineDistance}
          onExpand={() => props.onExpand("airlines-distance")}
        />
      </div>
      <div className="statistics-usage">
        <UsageCard
          icon={<AircraftSideIcon />}
          title="Most used aircraft"
          items={props.aircraftCount}
          onExpand={() => props.onExpand("aircraft-count")}
        />
        <UsageCard
          icon={<AircraftSideIcon />}
          eyebrow="Top 5 · distance"
          title="Aircraft by distance"
          items={props.aircraftDistance}
          onExpand={() => props.onExpand("aircraft-distance")}
        />
      </div>
      <div className="statistics-final-charts">
        <UsageCard
          icon={<Globe2 size={22} />}
          eyebrow="Top 5 · visits"
          title="Most visited countries"
          items={props.countries}
          onExpand={() => props.onExpand("countries")}
        />
        <YearlyFlightsChart data={props.flightsByYear} />
      </div>
    </>
  );
}
