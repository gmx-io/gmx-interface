import CloseIcon from "img/ic_close.svg?react";

export const CloseToastButton = ({ closeToast }: { closeToast: (e: any) => void }) => {
  return (
    <div className="close-toast-button group py-12 pr-12" onClick={closeToast}>
      <CloseIcon className="size-20 shrink-0 cursor-pointer text-typography-secondary group-hover:text-typography-primary" />
    </div>
  );
};
