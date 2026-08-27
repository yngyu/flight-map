export interface StoredCsv {
  readonly name: string;
  readonly text: string;
}

const latestCsvStorageKey = "flight-map.latest-csv.v1";

export function loadLatestCsv(): StoredCsv | null {
  try {
    const storedValue = window.localStorage.getItem(latestCsvStorageKey);

    if (storedValue === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(storedValue);

    if (!isStoredCsv(parsed)) {
      window.localStorage.removeItem(latestCsvStorageKey);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveLatestCsv(csv: StoredCsv): boolean {
  try {
    window.localStorage.setItem(latestCsvStorageKey, JSON.stringify(csv));
    return true;
  } catch {
    return false;
  }
}

function isStoredCsv(value: unknown): value is StoredCsv {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<StoredCsv>;

  return typeof candidate.name === "string" && typeof candidate.text === "string";
}
