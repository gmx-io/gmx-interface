import cx from "classnames";
import React, { PropsWithChildren, useCallback, useRef } from "react";

import { useSorterConfig } from "context/SorterContext/SorterContextProvider";
import { SortDirection, SorterConfig, SorterKey } from "context/SorterContext/types";

import IcSortable from "img/ic_sortable.svg?react";
import IcSortedAsc from "img/ic_sorted_asc.svg?react";
import IcSortedDesc from "img/ic_sorted_desc.svg?react";

export const directionIconMap: Record<SortDirection, React.ComponentType<{ className?: string }>> = {
  asc: IcSortedAsc,
  desc: IcSortedDesc,
  unspecified: IcSortable,
};
const directionSequence: SortDirection[] = ["desc", "asc", "unspecified"];

export function Sorter(
  props: PropsWithChildren<{
    direction: SortDirection;
    onChange: (direction: SortDirection) => void;
    showOnHover?: boolean;
  }>
) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.contains(e.target as Node)) {
      e.stopPropagation();
      const currentIndex = directionSequence.indexOf(props.direction);
      const nextIndex = (currentIndex + 1) % directionSequence.length;
      props.onChange(directionSequence[nextIndex]);
    }
  };

  const Icon = directionIconMap[props.direction];
  const isActive = props.direction !== "unspecified";
  const hideIcon = props.showOnHover && !isActive;

  return (
    <button
      className={cx("group/sorter inline-flex items-center [text-align:inherit] [text-transform:inherit]", {
        "text-blue-300": isActive,
      })}
      onClickCapture={handleClick}
    >
      {props.children}
      <Icon
        className={cx("h-16 w-12", {
          "opacity-0 transition-opacity group-hover/sorter:opacity-100": hideIcon,
        })}
      />
    </button>
  );
}

export function useSorterHandlers<SortField extends string | "unspecified">(
  key: SorterKey,
  initialConfig?: SorterConfig<SortField>
) {
  const [config, setConfig] = useSorterConfig<SortField | "unspecified">(key, initialConfig);
  const onChangeCache = useRef<Partial<Record<SortField | "unspecified", (direction: SortDirection) => void>>>({});

  const getSorterProps = useCallback(
    (field: SortField | "unspecified") => {
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
    (field: SortField | "unspecified") => {
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
