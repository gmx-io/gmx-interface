import { useMemo } from 'react';
import { TableTr } from '@/components/Common/Table/Table';

interface CurrentTableProps {
  data: any[];
  page?: number;
  listTr?: string;
  // emptyMessage?: string;
}

const CurrentPageItemsFixedList: React.FC<CurrentTableProps> = ({
  listTr = 'gmListTr',
  data,
  page = 10,
}: CurrentTableProps) => {
  const dataLength = data?.length ?? 0;

  const trHeight = useMemo(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const targetRow = document.querySelector<HTMLTableRowElement>(
      `.${listTr}`
    );

    return targetRow?.clientHeight;
  }, [dataLength, listTr]);

  const currentPageItems = useMemo(() => {
    let currentItems: number[] = [];

    if (!data || data.length === 0) {
      return currentItems;
    } else if (data.length < page) {
      const count = page - data.length;
      const emptyList = Array.from({ length: count }, (_, index) => index);
      currentItems = emptyList; 
    }
    return currentItems;
  }, [data, page]);

  return currentPageItems.map((item) => (
    <TableTr
      style={trHeight ? { height: `${trHeight}px` } : undefined}
      key={item}
    />
  ));
};

export default CurrentPageItemsFixedList;
