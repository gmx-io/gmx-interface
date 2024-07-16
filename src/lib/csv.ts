const CSV_SEPARATOR = ",";

function filterFields<T>(data: T, excludedFields: (keyof T)[]): Partial<T> {
  const result = { ...data };
  excludedFields.forEach((field) => delete result[field]);
  return result;
}

function convertToCSV<T>(data: Partial<T>[], customHeaders?: Partial<Record<keyof T, string>>): string {
  const keys = customHeaders ? Object.keys(customHeaders) : Object.keys(data[0]);

  const header = keys.map((key) => customHeaders?.[key as keyof T] ?? key).join(CSV_SEPARATOR);

  const values = data
    .map((object) =>
      keys
        .map((key) => {
          const value = object[key];
          const cell = value === undefined ? "" : String(value);
          return cell.includes(CSV_SEPARATOR) ? `"${cell}"` : cell;
        })
        .join(CSV_SEPARATOR)
    )
    .join("\n");
  return `${header}\n${values}`;
}

export function downloadAsCsv<T>(
  fileName: string,
  data: T[],
  excludedFields: (keyof T)[],
  customHeaders?: Partial<Record<keyof T, string>>
) {
  const filteredData = data.map((item) => filterFields(item, excludedFields));
  const csv = convertToCSV(filteredData, customHeaders);
  const blob = new Blob([csv], { type: "text/csv" });
  const csvUrl = window.URL.createObjectURL(blob);
  const aElement = document.createElement("a");
  aElement.href = csvUrl;
  aElement.download = `${fileName}.csv`;
  document.body.appendChild(aElement);
  aElement.click();
  document.body.removeChild(aElement);
  window.URL.revokeObjectURL(csvUrl);
}
