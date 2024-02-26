import { useCallback } from "react";
import DownloadIcon from "img/ic_download.svg";
import cx from "classnames";

type Props<T> = {
  data: T[];
  excludedFields: (keyof T)[];
  fileName: string;
  className?: string;
};

function filterFields<T>(data: T, excludedFields: (keyof T)[]): Partial<T> {
  const result = { ...data };
  excludedFields.forEach((field) => delete result[field as keyof T]);
  return result;
}

function convertToCSV<T>(data: Partial<T>[], separator = ",", customHeader?: Partial<Record<keyof T, string>>): string {
  const keys = customHeader ? Object.keys(customHeader) : Object.keys(data[0]);

  const header = keys.map((key) => customHeader?.[key as keyof T] || key).join(separator);

  const values = data
    .map((object) =>
      keys
        .map((key) => object[key as keyof T])
        .map((cell) => (cell === undefined ? "" : String(cell)))
        .map((cell) => (cell.includes(separator) ? `"${cell}"` : cell))
        .join(separator)
    )
    .join("\n");
  return `${header}\n${values}`;
}

export function downloadAsCsv<T>(
  fileName: string,
  data: T[],
  excludedFields: (keyof T)[],
  separator = ",",
  customHeader?: Partial<Record<keyof T, string>>
) {
  const filteredData = data.map((item) => filterFields(item, excludedFields));
  const csv = convertToCSV(filteredData, separator, customHeader);
  const csvUrl = `data:application/octet-stream,${encodeURIComponent(csv)}`;
  const aElement = document.createElement("a");
  aElement.href = csvUrl;
  aElement.download = `${fileName}.csv`;
  document.body.appendChild(aElement);
  aElement.click();
  document.body.removeChild(aElement);
}

export function DownloadAsCsv<T>({ data, excludedFields, fileName, className }: Props<T>) {
  const onClick = useCallback(() => {
    downloadAsCsv(fileName, data, excludedFields);
  }, [data, fileName, excludedFields]);

  if (!data || data.length === 0) {
    return null;
  }

  return <img className={cx("clickable", className)} src={DownloadIcon} alt="Download as CSV" onClick={onClick} />;
}
