import cx from "classnames";
import { PropsWithChildren, useCallback, useMemo, useRef, useState } from "react";
import { RemoveScroll } from "react-remove-scroll";

import Button from "components/Button/Button";

import LeftArrowIcon from "img/ic_arrowleft16.svg?react";

const HEADER_HEIGHT = 52;

export function Curtain({
  children,
  header,
  dataQa,
}: PropsWithChildren<{
  header: React.ReactNode;
  dataQa?: string;
}>) {
  const curtainRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const curtainStyle = useMemo(() => {
    return {
      top: `calc(100dvh - ${HEADER_HEIGHT}px)`,
      maxHeight: `calc(100dvh - ${HEADER_HEIGHT}px)`,
      transform: `translateY(${isOpen ? `calc(-100% + ${HEADER_HEIGHT}px)` : 0})`,
      transition: "transform 150ms ease-out",
    };
  }, [isOpen]);

  const headerClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-[999] bg-black/70 transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <RemoveScroll enabled={isOpen}>
        <div
          data-qa={dataQa}
          ref={curtainRef}
          className="text-body-medium fixed left-0 right-0 z-[1000] flex flex-col rounded-t-4 border-x border-t border-gray-800 bg-slate-800
      shadow-[0px_-24px_48px_-8px_rgba(0,0,0,0.35)] will-change-transform"
          style={curtainStyle}
        >
          <div className="flex items-stretch justify-between gap-8 px-15 pb-8 pt-8">
            <div className="grow" onClick={headerClick}>
              {header}
            </div>
            <Button variant="secondary" className="size-34 !px-0 !py-0" onClick={handleClick}>
              <LeftArrowIcon
                className={cx(
                  "transition-transform delay-150 duration-500 ease-out",
                  isOpen ? "-rotate-90" : "rotate-90"
                )}
              />
            </Button>
          </div>

          <div ref={innerContainerRef} className="overflow-y-auto">
            <div ref={innerRef} className="px-15 pb-10">
              {children}
            </div>
          </div>
        </div>
      </RemoveScroll>
    </>
  );
}
