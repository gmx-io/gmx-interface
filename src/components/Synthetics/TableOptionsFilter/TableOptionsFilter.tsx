import isEqual from "lodash/isEqual";
import React, { ComponentType, useState } from "react";
import type { Placement } from "@floating-ui/dom";

import { EMPTY_ARRAY } from "lib/objects";

import { FlatItems, useFilteredFlatItems } from "./flat";
import { Groups, useFilteredGroups } from "./groups";
import { FilteredGroup, Group, Item } from "./types";

import SearchInput from "components/SearchInput/SearchInput";
import { TableFilterBase } from "components/Synthetics/TableFilterBase/TableFilterBase";

import "./TableOptionsFilter.scss";

export type Props<T> = {
  placeholder?: string;
  label: string;
  ItemComponent?: ComponentType<{ item: T }>;
  options: Item<T>[] | Group<T>[];
  popupPlacement?: Placement;
} & (
  | {
      multiple?: false;
      disableGroupSelection?: false;
      value?: T;
      onChange: (value: T) => void;
    }
  | {
      multiple: true;
      disableGroupSelection?: boolean;
      value?: T[];
      onChange: (value: T[]) => void;
    }
);

export function TableOptionsFilter<T>({
  value,
  onChange,
  options,
  multiple,
  disableGroupSelection,
  placeholder,
  label,
  ItemComponent,
  popupPlacement,
}: Props<T>) {
  const isActive = multiple ? Boolean(value?.length) : Boolean(value);

  const isGrouped = "groupName" in options[0] && "items" in options[0];

  const showGroupToggle = multiple && !disableGroupSelection && isGrouped;

  const [search, setSearch] = useState("");

  const filteredGroups = useFilteredGroups({
    isGrouped,
    search,
    multiple,
    value,
    options,
  });

  const filteredFlatItems = useFilteredFlatItems({
    isGrouped,
    options,
    search,
  });

  function togglePair(newItem: T) {
    if (multiple) {
      const ensuredValue = value || EMPTY_ARRAY;
      if (ensuredValue.some((pair) => isEqual(pair, newItem))) {
        onChange(ensuredValue.filter((pair) => !isEqual(pair, newItem)));
      } else {
        onChange([...ensuredValue, newItem]);
      }

      return;
    }

    onChange(newItem);
  }

  function handleSearchEnterKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter") {
      return;
    }

    if (isGrouped && filteredGroups!.length > 0) {
      togglePair(filteredGroups![0].items[0].data);

      return;
    }

    if (filteredFlatItems!.length > 0) {
      togglePair(filteredFlatItems![0].data);
    }
  }

  function getIsSelected(item: T) {
    if (multiple) {
      const ensuredValue = value || EMPTY_ARRAY;
      return ensuredValue.some((selectedPair) => isEqual(selectedPair, item));
    }

    return isEqual(value, item);
  }

  function handleGroupToggle(group: FilteredGroup<T>) {
    if (!multiple || disableGroupSelection) {
      return;
    }

    const ensuredValue = value || EMPTY_ARRAY;

    if (group.isEverythingFilteredSelected) {
      onChange(ensuredValue.filter((pair) => !group.items.some((item) => isEqual(pair, item.data))));
    } else {
      onChange(ensuredValue.concat(group.items.map((item) => item.data)));
    }
  }

  return (
    <TableFilterBase label={label} isActive={isActive} popupPlacement={popupPlacement}>
      <SearchInput
        className="TableOptionsFilter-search"
        placeholder={placeholder}
        value={search}
        setValue={(event) => setSearch(event.target.value)}
        onKeyDown={handleSearchEnterKey}
      />

      <div className="TableOptionsFilter-options">
        {isGrouped ? (
          <Groups
            filteredGroups={filteredGroups!}
            handleGroupToggle={handleGroupToggle}
            togglePair={togglePair}
            getIsSelected={getIsSelected}
            showGroupToggle={showGroupToggle}
            ItemComponent={ItemComponent}
          />
        ) : (
          <FlatItems
            filteredFlatItems={filteredFlatItems!}
            getIsSelected={getIsSelected}
            togglePair={togglePair}
            ItemComponent={ItemComponent}
          />
        )}
      </div>
    </TableFilterBase>
  );
}
