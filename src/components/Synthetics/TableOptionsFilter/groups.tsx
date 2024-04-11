import isEqual from "lodash/isEqual";
import { ComponentType, memo, useCallback, useMemo } from "react";

import { definedOrThrow } from "lib/guards";

import Checkbox from "components/Checkbox/Checkbox";

import { FilteredGroup, Group, Item } from "./types";

import { ReactComponent as PartialCheckedIcon } from "img/ic_partial_checked.svg";

type GroupsProps<T> = {
  filteredGroups: FilteredGroup<T>[];
  onToggleGroup?: (group: FilteredGroup<T>) => void;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  showGroupToggle?: boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

export function Groups<T>({
  filteredGroups,
  onToggleGroup,
  onTogglePair,
  getIsSelected,
  showGroupToggle,
  ItemComponent,
}: GroupsProps<T>) {
  return (
    <>
      {filteredGroups.map((group) => (
        <GroupComponentMemo
          key={group.groupName}
          group={group}
          onToggleGroup={onToggleGroup}
          onTogglePair={onTogglePair}
          getIsSelected={getIsSelected}
          showGroupToggle={showGroupToggle}
          ItemComponent={ItemComponent}
        />
      ))}
    </>
  );
}

type GroupComponentProps<T> = {
  group: FilteredGroup<T>;
  onToggleGroup?: (group: FilteredGroup<T>) => void;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  showGroupToggle?: boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

function GroupComponent<T>({
  group,
  showGroupToggle,
  onToggleGroup,
  onTogglePair,
  getIsSelected,
  ItemComponent,
}: GroupComponentProps<T>) {
  const handleGroupToggle = useCallback(() => {
    definedOrThrow(onToggleGroup);
    onToggleGroup(group);
  }, [group, onToggleGroup]);

  return (
    <div key={group.groupName} className="TableOptionsFilter-group">
      {showGroupToggle ? (
        <div className="TableOptionsFilter-group-name" onClick={handleGroupToggle}>
          {group.isSomethingSelected && !group.isEverythingSelected ? (
            <div className="Checkbox">
              <PartialCheckedIcon className="Checkbox-icon" />
            </div>
          ) : (
            <Checkbox isChecked={group.isEverythingSelected} setIsChecked={handleGroupToggle} />
          )}
          <span>{group.groupName}</span>
        </div>
      ) : (
        <div className="TableOptionsFilter-group-name">{group.groupName}</div>
      )}
      {group.items.map((pair) => (
        <ItemComponentWrapperMemo
          key={pair.text}
          item={pair}
          onTogglePair={onTogglePair}
          getIsSelected={getIsSelected}
          ItemComponent={ItemComponent}
        />
      ))}
    </div>
  );
}

const GroupComponentMemo = memo(GroupComponent) as typeof GroupComponent;

type ItemComponentWrapperProps<T> = {
  item: Item<T>;
  onTogglePair: (pair: T) => void;
  getIsSelected: (pair: T) => boolean;
  ItemComponent?: ComponentType<{
    item: T;
  }>;
};

function ItemComponentWrapper<T>({ item, onTogglePair, getIsSelected, ItemComponent }: ItemComponentWrapperProps<T>) {
  const handleTogglePair = useCallback(() => {
    onTogglePair(item.data);
  }, [item.data, onTogglePair]);

  return (
    <div
      key={item.text}
      className="TableOptionsFilter-option TableOptionsFilter-option-in-group"
      onClick={handleTogglePair}
    >
      <Checkbox isChecked={getIsSelected(item.data)} setIsChecked={handleTogglePair}>
        {ItemComponent ? <ItemComponent item={item.data} /> : item.text}
      </Checkbox>
    </div>
  );
}

const ItemComponentWrapperMemo = memo(ItemComponentWrapper) as typeof ItemComponentWrapper;

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
