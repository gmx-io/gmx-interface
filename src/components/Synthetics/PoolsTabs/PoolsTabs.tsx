import cx from "classnames";
import { ReactNode } from "react";

import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

type PoolTab<T> = {
  label: ReactNode;
  value: T;
};

export function PoolsTabs<T extends string | number>({
  tabs,
  selected,
  setSelected,
  itemClassName,
}: {
  tabs: PoolTab<T>[];
  selected: T;
  setSelected: (tab: T) => void;
  itemClassName?: string;
}) {
  const isMobile = usePoolsIsMobilePage();

  return (
    <div className="flex flex-wrap gap-8">
      {tabs.map((tab) => (
        <div
          key={tab.value as string}
          className={cx(
            "text-body-medium cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-4 py-8",
            itemClassName,
            {
              "!bg-cold-blue-500 !text-white": selected === tab.value,
              "px-12": isMobile,
              "px-16": !isMobile,
            }
          )}
          onClick={() => setSelected(tab.value)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}
