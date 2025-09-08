import cx from "classnames";
import React, { useState } from "react";

import IcCross from "img/ic_cross.svg?react";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function FaqItem({ title, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="flex flex-col border-b-[0.5px] border-slate-600 py-28">
      <div
        onClick={handleClick}
        className="duration-180 mb-12 flex cursor-pointer items-center justify-between gap-[44px] transition-colors hover:text-blue-400"
      >
        <h3 className="text-heading-4">{title}</h3>
        <div className="flex size-23 flex-shrink-0 items-center justify-center">
          <IcCross
            className={cx("duration-180 margin-auto size-16 origin-center transition-transform", {
              "rotate-45": !isOpen,
            })}
          />
        </div>
      </div>
      <div
        className={cx(
          "leading-body-md text-slate-400 duration-180 flex flex-col gap-16 overflow-hidden text-16 -tracking-[0.512px] transition-all ease-in-out",
          {
            "max-h-0 opacity-0": !isOpen,
            "max-h-[1000px] opacity-100": isOpen,
          }
        )}
      >
        {children}
      </div>
    </div>
  );
}
