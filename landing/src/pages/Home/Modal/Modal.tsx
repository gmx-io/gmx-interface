import cx from "classnames";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import IcCross from "img/ic_cross.svg?react";

type ModalProps = {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

type ModalHeaderProps = {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
};

type ModalBodyProps = {
  children: React.ReactNode;
  className?: string;
};

type ModalBottomProps = {
  children: React.ReactNode;
  className?: string;
};

export function Modal({ onClose, children, className }: ModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.keyCode === 27 && onClose)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-screen w-screen bg-slate-900/50 text-white" onClick={handleBackdropClick}>
      <div
        className={cx(
          "bg-surface-primary border-stroke-primary m-auto flex w-[351px] flex-col rounded-8 border-1/2 sm:w-[420px]",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ModalHeader({ children, onClose, showCloseButton = true, className }: ModalHeaderProps) {
  return (
    <div className={cx("border-stroke-p rimary flex justify-between gap-20 border-b-1/2 p-20 pt-24", className)}>
      <h3 className="text-16 font-medium leading-[125%] tracking-[-0.192px]">{children}</h3>
      {showCloseButton && onClose && (
        <button className="mr-4" onClick={onClose}>
          <IcCross className="size-16 text-slate-500" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cx("tracking-body flex flex-col gap-16 p-20 text-14 font-normal leading-[130%]", className)}>
      {children}
    </div>
  );
}

export function ModalBottom({ children, className }: ModalBottomProps) {
  return (
    <div className={cx("border-stroke-primary flex items-center gap-4 border-t-1/2 pt-12", className)}>{children}</div>
  );
}
