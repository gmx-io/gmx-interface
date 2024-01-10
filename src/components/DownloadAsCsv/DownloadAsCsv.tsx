import { useCallback } from "react";
import DownloadIcon from "img/ic_download.svg";
import cx from "classnames";

type Props<T> = {
  data: T[];
  excludedFields: string[];
  fileName: string;
  className?: string;
};

function filterFields<T>(data: T, excludedFields: string[]): Partial<T> {
  const result = { ...data };
  excludedFields.forEach((field) => delete result[field]);
  return result;
}

function convertToCSV<T>(data: Partial<T>[]): string {
  const header = Object.keys(data[0]).join(",");
  const values = data.map((object) => Object.values(object).join(",")).join("\n");
  return `${header}\n${values}`;
}

export function DownloadAsCsv<T>({ data, excludedFields, fileName, className }: Props<T>) {
  const getCsvUrl = useCallback(
    (data: T[]) => {
      const filteredData = data.map((item) => filterFields(item, excludedFields));
      const csv = convertToCSV(filteredData);
      return `data:application/octet-stream,${encodeURIComponent(csv)}`;
    },
    [excludedFields]
  );

  const onClick = useCallback(() => {
    const csvUrl = getCsvUrl(data);
    const aElement = document.createElement("a");
    aElement.href = csvUrl;
    aElement.download = `${fileName}.csv`;
    document.body.appendChild(aElement);
    aElement.click();
    document.body.removeChild(aElement);
  }, [data, fileName, getCsvUrl]);

  if (!data || data.length === 0) {
    return null;
  }

  return <img className={cx("clickable", className)} src={DownloadIcon} alt="Download as CSV" onClick={onClick} />;
}
