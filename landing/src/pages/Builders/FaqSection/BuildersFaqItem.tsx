import cx from "classnames";
import React, { useState } from "react";

import IcCross from "img/ic_cross.svg?react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function BuildersFaqItem({ title, defaultOpen, children }: Props) {
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));

  return (
    <div className="flex flex-col border-b-1/2 border-slate-600 py-32">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="duration-180 flex cursor-pointer items-center justify-between gap-44 transition-colors hover:text-blue-400"
      >
        <h3 className="text-24 font-medium -tracking-[0.768px]">{title}</h3>
        <div className="flex size-24 flex-shrink-0 items-center justify-center">
          <IcCross
            className={cx("duration-180 size-16 origin-center text-slate-500 transition-transform", {
              "rotate-45": !isOpen,
            })}
          />
        </div>
      </div>
      <div
        className={cx(
          "duration-180 leading-body-sm flex max-w-[600px] flex-col overflow-hidden text-16 -tracking-[0.512px] text-slate-400 transition-all ease-in-out",
          isOpen ? "mt-12 max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
