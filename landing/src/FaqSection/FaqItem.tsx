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
    <div className="border-fiord-500 flex flex-col border-b-[0.5px] py-28">
      <div className="duration-180 mb-12 flex cursor-pointer items-center justify-between gap-[44px] transition-colors hover:text-blue-600">
        <h3 className="text-heading-4" onClick={handleClick}>
          {title}
        </h3>
        <span className="text-heading-4">
          <IcCross
            className={cx("duration-180 size-24 origin-center transition-transform", { "rotate-45": !isOpen })}
          />
        </span>
      </div>
      <div
        className={cx(
          "leading-body-md text-secondary duration-180 flex flex-col gap-16 overflow-hidden text-16 -tracking-[0.512px] transition-all ease-in-out",
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
