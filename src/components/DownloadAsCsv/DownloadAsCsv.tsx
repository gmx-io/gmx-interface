import { ReactNode, useCallback } from "react";
import Button from "components/Button/Button";
import { Trans } from "@lingui/macro";
import { FiDownload } from "react-icons/fi";

type Props<T> = {
  data: T[];
  excludedFields: string[];
  fileName: string;
  className?: string;
  children?: ReactNode;
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

function DefaultButtonContent() {
  return (
    <>
      <FiDownload />
      <span className="ml-xs">
        <Trans>Download CSV</Trans>
      </span>
    </>
  );
}

export function DownloadAsCsv<T>({ data, excludedFields, fileName, className, children }: Props<T>) {
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

  return (
    <Button variant="secondary" title="Download CSV" className={className} onClick={onClick}>
      {children ?? <DefaultButtonContent />}
    </Button>
  );
}
