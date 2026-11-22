export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** Escape one cell: neutralise spreadsheet formulas, then RFC4180-quote if needed. */
export function escapeCsvCell(input: unknown): string {
  if (input === null || input === undefined) return "";
  let s = input instanceof Date ? input.toISOString() : String(input);
  if (typeof input !== "number" && FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], opts: { bom?: boolean } = {}): string {
  const lines = [columns.map((c) => escapeCsvCell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escapeCsvCell(c.value(row))).join(","));
  const body = lines.join("\r\n") + "\r\n";
  return opts.bom ? String.fromCharCode(0xfeff) + body : body;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
