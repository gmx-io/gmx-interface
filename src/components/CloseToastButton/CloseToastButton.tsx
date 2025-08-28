import { FaCross } from "react-icons/fa";

export const CloseToastButton = ({ closeToast }: { closeToast: (e: any) => void }) => {
  return (
    <div className="close-toast-button group p-2" onClick={closeToast}>
      <FaCross className="size-20 shrink-0 cursor-pointer text-typography-secondary group-hover:text-typography-primary" />
    </div>
  );
};
