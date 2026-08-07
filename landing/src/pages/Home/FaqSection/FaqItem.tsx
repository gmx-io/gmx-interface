import cx from "classnames";
import React, { useState } from "react";

import IcCross from "img/ic_cross.svg?react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  iconClassName?: string;
  children: React.ReactNode;
};

export function FaqItem({ title, defaultOpen, iconClassName = "size-16", children }: Props) {
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="flex flex-col border-b-1/2 border-slate-600 py-28">
      <div
        onClick={handleClick}
        className="duration-180 mb-12 flex cursor-pointer items-center justify-between gap-[44px] transition-colors hover:text-blue-400"
      >
        <h3 className="text-heading-4">{title}</h3>
        <div className="flex size-23 flex-shrink-0 items-center justify-center">
          <IcCross
            className={cx("duration-180 margin-auto origin-center transition-transform", iconClassName, {
              "rotate-45": !isOpen,
            })}
          />
        </div>
      </div>
      <div
        className={cx(
          "duration-180 grid transition-[grid-template-rows] ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div
          className={cx(
            "leading-body-md duration-180 flex min-h-0 flex-col gap-16 overflow-hidden text-16 -tracking-[0.512px] text-slate-400 transition-opacity ease-in-out",
            isOpen ? "opacity-100" : "opacity-0"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
