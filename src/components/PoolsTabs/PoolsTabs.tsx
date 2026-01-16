import cx from "classnames";
import type { ReactNode } from "react";

import Button from "components/Button/Button";

type PoolTab<T> = {
  label: ReactNode;
  value: T;
};

export function PoolsTabs<T extends string | number>({
  tabs,
  selected,
  setSelected,
  itemClassName,
  className,
}: {
  tabs: PoolTab<T>[];
  selected: T;
  setSelected: (tab: T) => void;
  itemClassName?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap gap-4", className)}>
      {tabs.map((tab) => (
        <Button
          key={tab.value as string}
          variant="ghost"
          className={cx(itemClassName, {
            "!bg-button-secondary !text-typography-primary": selected === tab.value,
          })}
          onClick={() => setSelected(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
