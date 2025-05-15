import cx from "classnames";
import { ReactNode } from "react";
import { useMedia } from "react-use";

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
  const isMobile = useMedia("(max-width: 768px)");

  return (
    <div className="flex gap-8 flex-wrap">
      {tabs.map((tab) => (
        <div
          key={tab.value as string}
          className={cx(
            "text-body-medium cursor-pointer rounded-4 py-8 whitespace-nowrap text-ellipsis overflow-hidden",
            itemClassName,
            {
              "!bg-cold-blue-500 !text-white": selected === tab.value,
              "px-12": isMobile,
              "px-16": !isMobile,
            },
          )}
          onClick={() => setSelected(tab.value)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}