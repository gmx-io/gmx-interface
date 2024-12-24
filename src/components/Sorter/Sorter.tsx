import cx from "classnames";
import React, { PropsWithChildren, useCallback, useRef } from "react";

import { SortDirection, SorterPersistedKey, useSorterConfig } from "domain/ui/sorterPersistence";

import IcSortable from "img/ic_sortable.svg?react";
import IcSortedAsc from "img/ic_sorted_asc.svg?react";
import IcSortedDesc from "img/ic_sorted_desc.svg?react";

const directionIconMap: Record<SortDirection, React.ComponentType> = {
  asc: IcSortedAsc,
  desc: IcSortedDesc,
  unspecified: IcSortable,
};
const directionSequence: SortDirection[] = ["desc", "asc", "unspecified"];

export function Sorter(
  props: PropsWithChildren<{ direction: SortDirection; onChange: (direction: SortDirection) => void }>
) {
  const handleClick = () => {
    const currentIndex = directionSequence.indexOf(props.direction);
    const nextIndex = (currentIndex + 1) % directionSequence.length;
    props.onChange(directionSequence[nextIndex]);
  };

  const Icon = directionIconMap[props.direction];

  return (
    <button
      className={cx("inline-flex items-center [text-align:inherit] [text-transform:inherit]", {
        "text-blue-300": props.direction !== "unspecified",
      })}
      onClick={handleClick}
    >
      {props.children}
      <Icon />
    </button>
  );
}

export function useSorterHandlers<SortField extends string | "unspecified">({
  initialOrderBy,
  initialDirection,
  persistenceKey,
}: { initialOrderBy?: SortField; initialDirection?: SortDirection; persistenceKey?: SorterPersistedKey } = {}) {
  const [config, setConfig] = useSorterConfig(persistenceKey ?? "in-memory", {
    orderBy: initialOrderBy ?? "unspecified",
    direction: initialDirection ?? "unspecified",
  });
  const onChangeCache = useRef<Partial<Record<SortField, (direction: SortDirection) => void>>>({});

  const getSorterProps = useCallback(
    (field: SortField) => {
      let cachedHandler = onChangeCache.current[field];

      if (!cachedHandler) {
        cachedHandler = (newDirection: SortDirection) => {
          setConfig({
            orderBy: field,
            direction: newDirection,
          });
        };
        onChangeCache.current[field] = cachedHandler;
      }

      return {
        direction: config.orderBy === field ? config.direction : "unspecified",
        onChange: cachedHandler!,
      };
    },
    [config.direction, config.orderBy, setConfig]
  );

  const setOrderBy = useCallback(
    (field: SortField) => {
      setConfig((prev) => ({
        ...prev,
        orderBy: field,
      }));
    },
    [setConfig]
  );

  const setDirection = useCallback(
    (direction: SortDirection) => {
      setConfig((prev) => ({
        ...prev,
        direction,
      }));
    },
    [setConfig]
  );

  return { getSorterProps, orderBy: config.orderBy, direction: config.direction, setOrderBy, setDirection };
}
