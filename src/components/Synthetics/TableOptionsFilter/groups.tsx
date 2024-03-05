import isEqual from "lodash/isEqual";
import { ComponentType, useMemo } from "react";

import Checkbox from "components/Checkbox/Checkbox";

import { FilteredGroup, Group, Item } from "./types";

import { ReactComponent as PartialCheckedIcon } from "img/ic_partial_checked.svg";

export function Groups<T>({
  filteredGroups,
  handleGroupToggle,
  togglePair,
  getIsSelected,
  showGroupToggle,
  ItemComponent,
}: {
  filteredGroups: FilteredGroup<T>[];
  handleGroupToggle?: (group: FilteredGroup<T>) => void;
  togglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  showGroupToggle?: boolean;
  ItemComponent?: ComponentType<{ item: T }>;
}) {
  return (
    <>
      {filteredGroups.map((group) => (
        <div key={group.groupName} className="TableOptionsFilter-group">
          {showGroupToggle ? (
            <div
              className="TableOptionsFilter-group-name"
              onClick={() => {
                handleGroupToggle!(group);
              }}
            >
              {group.isSomethingSelected && !group.isEverythingSelected ? (
                <div className="Checkbox">
                  <PartialCheckedIcon className="Checkbox-icon" />
                </div>
              ) : (
                <Checkbox isChecked={group.isEverythingSelected} />
              )}
              <span>{group.groupName}</span>
            </div>
          ) : (
            <div className="TableOptionsFilter-group-name">{group.groupName}</div>
          )}
          {group.items.map((pair) => (
            <div
              key={pair.text}
              className="TableOptionsFilter-option TableOptionsFilter-option-in-group"
              onClick={() => {
                togglePair(pair.data);
              }}
            >
              <Checkbox isChecked={getIsSelected(pair.data)}>
                {ItemComponent ? <ItemComponent item={pair.data} /> : pair.text}
              </Checkbox>
            </div>
          ))}
        </div>
      ))}
    </>
  );
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
      const items = group.items.filter((pair) => {
        return pair.text.toLowerCase().includes(search.toLowerCase());
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
