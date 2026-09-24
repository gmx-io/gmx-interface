import Checkbox from '@/components/Common/CheckBox/CheckBox';
import { definedOrThrow } from '@/utils/lib/assertions';
import { ComponentType, memo, useCallback } from 'react';

import { FilteredGroup, Item } from './types';

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
    <div key={group.groupName} className="TableOptionsFilter-group group/group">
      {showGroupToggle ? (
        <div
          className="TableOptionsFilter-group-name"
          onClick={handleGroupToggle}
        >
          <Checkbox
            isPartialChecked={
              group.isSomethingSelected && !group.isEverythingSelected
            }
            isChecked={group.isEverythingSelected}
            setIsChecked={handleGroupToggle}
          >
            {group.groupName}
          </Checkbox>
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

function ItemComponentWrapper<T>({
  item,
  onTogglePair,
  getIsSelected,
  ItemComponent,
}: ItemComponentWrapperProps<T>) {
  const handleTogglePair = useCallback(() => {
    onTogglePair(item.data);
  }, [item.data, onTogglePair]);

  return (
    <div
      key={item.text}
      className="TableOptionsFilter-option TableOptionsFilter-option-in-group"
      onClick={handleTogglePair}
    >
      <Checkbox
        isChecked={getIsSelected(item.data)}
        setIsChecked={handleTogglePair}
      >
        {ItemComponent ? <ItemComponent item={item.data} /> : item.text}
      </Checkbox>
    </div>
  );
}

const ItemComponentWrapperMemo = memo(
  ItemComponentWrapper
) as typeof ItemComponentWrapper;
