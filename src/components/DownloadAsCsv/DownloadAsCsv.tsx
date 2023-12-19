import React, { useCallback } from "react";
import Button from "components/Button/Button";
import Papa from "papaparse";

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

export function DownloadAsCsv<T>({ data, excludedFields, fileName, className }: Props<T>) {
  const getCsvUrl = useCallback(
    (data: T[]) => {
      const filteredData = data.map((item) => filterFields(item, excludedFields));
      const csv = Papa.unparse(filteredData);
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

  return (
    <Button variant="secondary" title="Download CSV" className={className} onClick={onClick}>
      Download CSV
    </Button>
  );
}
