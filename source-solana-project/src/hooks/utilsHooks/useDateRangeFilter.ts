import { useMemo } from 'react';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface ItemWithTimestamp {
  timestamp: string | number | Date;
}

export function useDateRangeFilter<T extends ItemWithTimestamp>(
  items: T[],
  dateRange: Value
): T[] {
  return useMemo(() => {
    if (!dateRange) {
      return items;
    }

    if (Array.isArray(dateRange)) {
      const [start, end] = dateRange;

      if (!start || !end) {
        return items;
      }

      const startOfDay = new Date(start);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      return items.filter((item) => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
    }

    const selectedDate = new Date(dateRange);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return items.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= startOfDay && itemDate <= endOfDay;
    });
  }, [items, dateRange]);
}
