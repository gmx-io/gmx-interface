import cx from "classnames";
import React, { PropsWithChildren, useCallback, useRef, useState } from "react";

import { ReactComponent as IcSortable } from "img/ic_sortable.svg";
import { ReactComponent as IcSortedAsc } from "img/ic_sorted_asc.svg";
import { ReactComponent as IcSortedDesc } from "img/ic_sorted_desc.svg";

export type SortDirection = "asc" | "desc" | "unspecified";

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
      className={cx("flex items-center", {
        "text-blue-300": props.direction !== "unspecified",
      })}
      onClick={handleClick}
    >
      {props.children}
      <Icon />
    </button>
  );
}

export function useSorterHandlers<SortField extends string | "unspecified">() {
  const [orderBy, setOrderBy] = useState<SortField | "unspecified">("unspecified");
  const [direction, setDirection] = useState<SortDirection>("unspecified");
  const onChangeCache = useRef<Partial<Record<SortField, (direction: SortDirection) => void>>>({});

  const getSorterProps = useCallback(
    (field: SortField) => {
      let cachedHandler = onChangeCache.current[field];

      if (!cachedHandler) {
        cachedHandler = (newDirection: SortDirection) => {
          setOrderBy(field);
          setDirection(newDirection);
        };
        onChangeCache.current[field] = cachedHandler;
      }

      return {
        direction: orderBy === field ? direction : "unspecified",
        onChange: cachedHandler!,
      };
    },
    [direction, orderBy]
  );

  return { getSorterProps, orderBy, direction };
}
