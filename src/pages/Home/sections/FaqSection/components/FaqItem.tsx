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
    <div className="flex flex-col gap-16 border-b-[0.5px] border-fiord-500 py-28">
      <div className="mb-12 flex cursor-pointer items-center justify-between gap-[44px] hover:text-blue-600">
        <h4 className="text-heading-4" onClick={handleClick}>
          {title}
        </h4>
        <span className="text-heading-4">
          <IcCross
            className={cx("size-24 origin-center transition-transform duration-300", { "rotate-45": !isOpen })}
          />
        </span>
      </div>
      <div
        className={cx(
          "leading-body-md flex flex-col gap-16 overflow-hidden text-16 -tracking-[0.512px] text-secondary transition-all duration-300 ease-in-out",
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
