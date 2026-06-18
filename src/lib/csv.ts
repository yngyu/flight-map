export interface CsvTable {
  readonly headers: readonly string[];
  readonly rows: readonly Readonly<Record<string, string>>[];
}

export function parseCsv(input: string): CsvTable {
  const parsedRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (insideQuotes) {
      if (character === "\"" && nextCharacter === "\"") {
        currentField += "\"";
        index += 1;
      } else if (character === "\"") {
        insideQuotes = false;
      } else {
        currentField += character;
      }
      continue;
    }

    if (character === "\"") {
      insideQuotes = true;
    } else if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (character === "\n") {
      currentRow.push(currentField.replace(/\r$/, ""));
      parsedRows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += character;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.replace(/\r$/, ""));
    parsedRows.push(currentRow);
  }

  const [headers, ...rows] = parsedRows.filter((row) => row.some((field) => field.trim().length > 0));

  if (headers === undefined) {
    return { headers: [], rows: [] };
  }

  return {
    headers,
    rows: rows.map((row) => buildRecord(headers, row)),
  };
}

function buildRecord(
  headers: readonly string[],
  row: readonly string[],
): Readonly<Record<string, string>> {
  const record: Record<string, string> = {};

  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });

  return record;
}
