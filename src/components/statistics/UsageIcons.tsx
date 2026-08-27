import { Plane } from "lucide-react";
import type { ReactElement } from "react";

export function TailFinIcon(): ReactElement {
  return (
    <svg width="25" height="23" viewBox="0 0 26 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 18.8h21M4 18.8c3.8-.2 6.2-2.1 8.1-5.2l5.2-8.1c.5-.8 1.2-1.2 2.1-1.2H22l-2.8 14.5H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m19.8 7.2-2.2 11.6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.72"
      />
    </svg>
  );
}

export function AircraftSideIcon(): ReactElement {
  return <Plane size={22} style={{ transform: "rotate(45deg)" }} aria-hidden="true" />;
}
