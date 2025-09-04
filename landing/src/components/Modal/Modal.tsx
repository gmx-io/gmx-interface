import cx from "classnames";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
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

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="bg-fiord-700/50 fixed inset-0 z-50 flex h-screen w-screen text-white" onClick={handleBackdropClick}>
      <div
        className={cx(
          "bg-fiord-800 m-auto flex w-[351px] flex-col rounded-8 border-[0.5px] border-[#363A59] sm:w-[420px]",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

Modal.Header = function ModalHeader({ children, onClose, showCloseButton = true, className }: ModalHeaderProps) {
  return (
    <div className={cx("flex justify-between gap-20 border-b-[0.5px] border-[#363A59] p-20 pt-24", className)}>
      <h3 className="text-16 font-medium leading-[125%] tracking-[-0.192px]">{children}</h3>
      {showCloseButton && onClose && (
        <button className="mr-4" onClick={onClose}>
          <svg className="size-16 text-slate-100" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 6.586L13.657.929a1 1 0 1 1 1.414 1.414L9.414 8l5.657 5.657a1 1 0 0 1-1.414 1.414L8 9.414l-5.657 5.657a1 1 0 0 1-1.414-1.414L6.586 8 .929 2.343A1 1 0 0 1 2.343.929L8 6.586z" />
          </svg>
        </button>
      )}
    </div>
  );
};

Modal.Body = function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cx("tracking-body flex flex-col gap-16 p-20 text-14 font-normal leading-[130%]", className)}>
      {children}
    </div>
  );
};

Modal.Bottom = function ModalBottom({ children, className }: ModalBottomProps) {
  return (
    <div className={cx("flex items-center gap-4 border-t-[0.5px] border-[#363A59] pt-12", className)}>{children}</div>
  );
};
