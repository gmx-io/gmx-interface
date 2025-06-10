import { IoMdSwap } from "react-icons/io";

export function Swap() {
  return (
    <div className="z-2 relative">
      <div
        className="absolute -top-19 left-1/2 flex size-36 -translate-x-1/2
                   rotate-90 cursor-not-allowed select-none items-center justify-center rounded-full
                   bg-[#1b1e32] text-white"
      >
        <IoMdSwap size={24} />
      </div>
    </div>
  );
}
