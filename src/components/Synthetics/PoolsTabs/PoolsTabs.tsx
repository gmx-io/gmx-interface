import cx from "classnames";
import { ReactNode } from "react";

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
  return (
    <div className="flex gap-8">
      {tabs.map((tab) => (
        <div
          key={tab.value as string}
          className={cx("text-body-medium cursor-pointer rounded-4 px-16 py-8", itemClassName, {
            "!bg-cold-blue-500 !text-white": selected === tab.value,
          })}
          onClick={() => setSelected(tab.value)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}