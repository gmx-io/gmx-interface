import cx from "classnames";
import { useCallback } from "react";

import { downloadAsCsv } from "lib/csv";

import DownloadIcon from "img/ic_download.svg";

type Props<T> = {
  data: T[];
  excludedFields: (keyof T)[];
  fileName: string;
  className?: string;
};

export function DownloadAsCsv<T>({ data, excludedFields, fileName, className }: Props<T>) {
  const onClick = useCallback(() => {
    downloadAsCsv(fileName, data, excludedFields);
  }, [data, fileName, excludedFields]);

  if (!data || data.length === 0) {
    return null;
  }

  return <img className={cx("clickable", className)} src={DownloadIcon} alt="Download as CSV" onClick={onClick} />;
}
