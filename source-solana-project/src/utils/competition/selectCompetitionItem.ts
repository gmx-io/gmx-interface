import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export type CompetitionStatus = 'upcoming' | 'ongoing' | 'ended' | 'empty';

export interface CompetitionItem {
  startTime: number;
  endTime: number;
}

export interface CompetitionWithStatus extends CompetitionItem {
  status: CompetitionStatus;
}

export interface CompetitionResult {
  item: CompetitionWithStatus;
  index: number;
  list: CompetitionWithStatus[];
}

export function getCompetitionStatus(item: CompetitionItem): CompetitionStatus {
  const now = dayjs.utc();
  const start = dayjs.utc(item.startTime * 1000);
  const end = dayjs.utc(item.endTime * 1000);

  if (now.isBefore(start)) return 'upcoming';
  if (now.isAfter(end)) return 'ended';
  if (!item.startTime || !item.endTime) return 'empty';

  return 'ongoing';
}

export function selectCompetitionItem(
  competitionList: CompetitionItem[]
): CompetitionResult | null {
  if (competitionList.length === 0) return null;

  const list: CompetitionWithStatus[] = competitionList.map((item) => ({
    ...item,
    status: getCompetitionStatus(item),
  }));

  const ongoingIndex = list.findIndex((item) => item.status === 'ongoing');
  const endedIndex = list.every((item) => item.status === 'ended');
  const emptyIndex = list.findIndex((item) => item.status === 'empty');

  if (ongoingIndex !== -1) {
    return {
      item: list[ongoingIndex],
      index: ongoingIndex,
      list,
    };
  }

  if (emptyIndex !== -1 && list.length >= 2) {
    return {
      item: list[list.length - 2],
      index: list.length - 2,
      list,
    };
  }

  if (endedIndex) {
    return {
      item: list[list.length - 1],
      index: list.length - 1,
      list,
    };
  }

  return {
    item: list[0],
    index: 0,
    list,
  };
}
