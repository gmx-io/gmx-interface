import type { Placement } from "@floating-ui/dom";
import { Trans } from "@lingui/macro";
import isEqual from "lodash/isEqual";
import {
  ChangeEventHandler,
  ComponentType,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useCallback,
  useState,
} from "react";

import { defined, definedOrThrow } from "lib/guards";
import { EMPTY_ARRAY } from "lib/objects";

import { FlatItems, useFilteredFlatItems } from "./flat";
import { Groups, useFilteredGroups } from "./groups";
import { FilteredGroup, Group, Item } from "./types";

import SearchInput from "components/SearchInput/SearchInput";
import { TableFilterBase } from "components/Synthetics/TableFilterBase/TableFilterBase";

import "./TableOptionsFilter.scss";

type Props<T> = {
  placeholder?: string;
  label: string;
  ItemComponent?: ComponentType<{ item: T }>;
  options: Item<T>[] | Group<T>[];
  popupPlacement?: Placement;
  beforeContent?: ReactNode | undefined;
  forceIsActive?: boolean;
} & (
  | {
      multiple?: false;
      disableGroupSelection?: false;
      value?: T;
      onChange: (value: T | undefined) => void;
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
  beforeContent,
  forceIsActive,
}: Props<T>) {
  const isActive = (multiple ? Boolean(value?.length) : Boolean(value)) || forceIsActive;

  const isGrouped = options.length > 0 && "groupName" in options[0] && "items" in options[0];

  const showGroupToggle = Boolean(multiple && !disableGroupSelection && isGrouped);

  const [search, setSearch] = useState("");
  const handleSetValue = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => setSearch(event.target.value),
    []
  );

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

  const togglePair = useCallback(
    (newItem: T) => {
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
    },
    [multiple, onChange, value]
  );

  const handleSearchEnterKey = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key !== "Enter") {
        return;
      }

      if (isGrouped) {
        definedOrThrow(filteredGroups);
        if (filteredGroups.length > 0) {
          togglePair(filteredGroups[0].items[0].data);
        }
      } else {
        definedOrThrow(filteredFlatItems);
        if (filteredFlatItems.length > 0) {
          togglePair(filteredFlatItems[0].data);
        }
      }
    },
    [filteredFlatItems, filteredGroups, isGrouped, togglePair]
  );

  const getIsSelected = useCallback(
    (item: T) => {
      if (multiple) {
        const ensuredValue = value || EMPTY_ARRAY;
        return ensuredValue.some((selectedPair) => isEqual(selectedPair, item));
      }

      return isEqual(value, item);
    },
    [multiple, value]
  );

  const handleGroupToggle = useCallback(
    (group: FilteredGroup<T>) => {
      if (!multiple || disableGroupSelection) {
        return;
      }

      const ensuredValue = value || EMPTY_ARRAY;

      if (group.isEverythingFilteredSelected) {
        onChange(ensuredValue.filter((pair) => !group.items.some((item) => isEqual(pair, item.data))));
      } else {
        onChange(ensuredValue.concat(group.items.map((item) => item.data)));
      }
    },
    [disableGroupSelection, multiple, onChange, value]
  );

  const handleClear = useCallback(() => {
    if (multiple) {
      onChange(EMPTY_ARRAY);
    } else {
      onChange(undefined);
    }
  }, [multiple, onChange]);

  return (
    <TableFilterBase label={label} isActive={isActive} popupPlacement={popupPlacement}>
      <SearchInput
        className="TableOptionsFilter-search"
        placeholder={placeholder}
        value={search}
        setValue={handleSetValue}
        onKeyDown={handleSearchEnterKey}
      />

      {beforeContent}

      <div className="TableOptionsFilter-options">
        <div className="TableOptionsFilter-clear" onClick={handleClear}>
          <Trans comment="Button to clear the filter selection">Clear selection</Trans>
        </div>
        {isGrouped && defined(filteredGroups) && (
          <Groups
            filteredGroups={filteredGroups}
            onToggleGroup={handleGroupToggle}
            onTogglePair={togglePair}
            getIsSelected={getIsSelected}
            showGroupToggle={showGroupToggle}
            ItemComponent={ItemComponent}
          />
        )}

        {!isGrouped && defined(filteredFlatItems) && (
          <FlatItems
            filteredFlatItems={filteredFlatItems}
            getIsSelected={getIsSelected}
            onTogglePair={togglePair}
            ItemComponent={ItemComponent}
          />
        )}
      </div>
    </TableFilterBase>
  );
}
