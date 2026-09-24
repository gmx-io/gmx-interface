import isEqual from 'lodash/isEqual';
import { getGmw330Enabled } from '@/config/featureFlagEnable';
import { useMemo } from 'react';

import { FilteredGroup, Group, Item } from './types';

const getSearchText = (value: unknown) =>
  typeof value === 'string' ? value.toLowerCase() : '';

export function useFilteredFlatItems<T>({
  isGrouped,
  options,
  search,
}: {
  isGrouped: boolean;
  options: Item<T>[] | Group<T>[];
  search: string;
}): Item<T>[] | null {
  return useMemo(() => {
    if (isGrouped) {
      return null;
    }

    const castedOptions = options as Item<T>[];
    const normalizedSearch = search.toLowerCase();

    return castedOptions.filter((pair) => {
      if (!getGmw330Enabled()) {
        return pair.text.toLowerCase().includes(normalizedSearch);
      }

      return getSearchText(pair.text).includes(normalizedSearch);
    });
  }, [isGrouped, options, search]);
}

export function useFilteredGroups<T>({
  isGrouped,
  search,
  multiple,
  value,
  options,
}: {
  isGrouped: boolean;
  search: string;
  multiple?: boolean;
  value?: T[] | T;
  options: Item<T>[] | Group<T>[];
}): FilteredGroup<T>[] | null {
  return useMemo(() => {
    if (!isGrouped) return null;

    const groups = options as Group<T>[];

    return filterGroups({
      groups,
      search,
      value,
      multiple,
    });
  }, [isGrouped, search, multiple, options, value]);
}

function filterGroups<T>({
  groups,
  search,
  value,
  multiple,
}: {
  groups: Group<T>[];
  search: string;
  value?: T[] | T;
  multiple?: boolean;
}): FilteredGroup<T>[] {
  return groups
    .map((group) => {
      const normalizedSearch = search.toLowerCase();
      const items = group.items.filter((pair) => {
        if (!getGmw330Enabled()) {
          return pair.text.toLowerCase().includes(normalizedSearch);
        }

        return getSearchText(pair.text).includes(normalizedSearch);
      });

      let isEverythingSelected: boolean | undefined;
      let isEverythingFilteredSelected: boolean | undefined;
      let isSomethingSelected: boolean | undefined;

      if (value && multiple) {
        const castedValue = value as T[];
        isEverythingSelected = group.items.every((item) =>
          castedValue.some((selectedItem) => isEqual(selectedItem, item.data))
        );
        isEverythingFilteredSelected = items.every((item) =>
          castedValue.some((selectedItem) => isEqual(selectedItem, item.data))
        );
        isSomethingSelected = group.items.some((item) =>
          castedValue.some((selectedItem) => isEqual(selectedItem, item.data))
        );
      }

      return {
        groupName: group.groupName,
        isEverythingSelected,
        isEverythingFilteredSelected,
        isSomethingSelected,
        items,
      };
    })
    .filter((group) => group.items.length > 0);
}
