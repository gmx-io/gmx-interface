const CSV_SEPARATOR = ",";
const CSV_LINE_BREAK = "\r\n";

export type CsvCell = string | number | bigint | boolean | null | undefined;
export type CsvRow = Record<string, CsvCell>;

const NUMERIC_CELL_REGEXP = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const FORMULA_CHARACTERS = new Set(["=", "+", "-", "@"]);

function filterFields<T>(data: T, excludedFields: (keyof T)[]): Partial<T> {
  const result = { ...data };
  excludedFields.forEach((field) => delete result[field]);
  return result;
}

export function protectCsvCell(value: string): string {
  const firstSignificantCharacter = Array.from(value).find(
    (character) => character.trim() !== "" && character.charCodeAt(0) > 31
  );
  if (
    NUMERIC_CELL_REGEXP.test(value) ||
    !firstSignificantCharacter ||
    !FORMULA_CHARACTERS.has(firstSignificantCharacter)
  ) {
    return value;
  }

  return `'${value}`;
}

function escapeCsvCell(value: CsvCell): string {
  if (value === undefined || value === null) {
    return "";
  }

  const cell = protectCsvCell(String(value));

  if (cell.includes(CSV_SEPARATOR) || cell.includes('"') || cell.includes("\r") || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
}

export function serializeCsv(headers: readonly string[], data: readonly CsvRow[]): string {
  const header = headers.map(escapeCsvCell).join(CSV_SEPARATOR);
  const values = data
    .map((row) => headers.map((key) => escapeCsvCell(row[key])).join(CSV_SEPARATOR))
    .join(CSV_LINE_BREAK);

  return values ? `${header}${CSV_LINE_BREAK}${values}${CSV_LINE_BREAK}` : `${header}${CSV_LINE_BREAK}`;
}

function convertToCSV<T>(data: Partial<T>[], customHeaders?: Partial<Record<keyof T, string>>): string {
  const keys = customHeaders ? Object.keys(customHeaders) : data[0] ? Object.keys(data[0]) : [];

  const headers = keys.map((key) => customHeaders?.[key as keyof T] ?? key);
  const rows = data.map((object) => Object.fromEntries(keys.map((key) => [key, object[key as keyof T]])) as CsvRow);

  return serializeCsv(headers, rows);
}

export function downloadFile(fileName: string, contents: BlobPart, contentType: string) {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function downloadAsCsv<T>(
  fileName: string,
  data: T[],
  excludedFields: (keyof T)[],
  customHeaders?: Partial<Record<keyof T, string>>
) {
  const filteredData = data.map((item) => filterFields(item, excludedFields));
  const csv = convertToCSV(filteredData, customHeaders);
  downloadFile(`${fileName}.csv`, csv, "text/csv;charset=utf-8");
}
