import { Maximize2, X } from "lucide-react";
import type { ReactElement } from "react";
import type { UsageItem } from "./types";

interface UsageCardProps {
  readonly icon: ReactElement;
  readonly eyebrow?: string;
  readonly title: string;
  readonly items: readonly UsageItem[];
  readonly onExpand: () => void;
}

export function UsageCard({
  icon,
  eyebrow = "Top 5 · flights",
  title,
  items,
  onExpand,
}: UsageCardProps): ReactElement {
  return (
    <button className="usage-card" type="button" onClick={onExpand}>
      <header>
        <span className="statistics-card-icon" aria-hidden="true">{icon}</span>
        <div>
          <span className="statistics-card-label">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <Maximize2 size={18} aria-hidden="true" />
      </header>
      <UsageList items={items.slice(0, 5)} />
    </button>
  );
}

export function UsageDialog({
  title,
  items,
  onClose,
}: {
  readonly title: string;
  readonly items: readonly UsageItem[];
  readonly onClose: () => void;
}): ReactElement {
  return (
    <div className="usage-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="usage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="page-eyebrow">All data</span>
            <h2 id="usage-dialog-title">{title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <UsageList items={items} />
      </section>
    </div>
  );
}

function UsageList({ items }: { readonly items: readonly UsageItem[] }): ReactElement {
  const maximum = items[0]?.count ?? 0;

  return (
    <div className="usage-list">
      {items.length === 0 ? <p>No flight data</p> : null}
      {items.map((item) => (
        <div className="usage-row" key={item.key}>
          <span title={item.label}>{item.label}</span>
          <span className="usage-bar" aria-hidden="true">
            <span style={{ width: `${maximum === 0 ? 0 : (item.count / maximum) * 100}%` }} />
          </span>
          <strong>{item.displayValue ?? item.count.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}
