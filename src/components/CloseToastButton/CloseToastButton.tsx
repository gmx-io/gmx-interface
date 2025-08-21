import { RxCross2 } from "react-icons/rx";

export const CloseToastButton = ({ closeToast }: { closeToast: (e: any) => void }) => {
  return (
    <div className="close-toast-button group p-2" onClick={closeToast}>
      <RxCross2 className="size-20 shrink-0 cursor-pointer text-slate-100 group-hover:text-white" />
    </div>
  );
};
