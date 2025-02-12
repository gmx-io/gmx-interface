import { IoMdSwap } from "react-icons/io";

export function Swap() {
  return (
    <div className="z-2 relative">
      <div
        className="absolute -top-19 left-1/2 flex size-36 -translate-x-1/2
                   cursor-not-allowed select-none items-center justify-center rounded-31 bg-[#1b1e32]
                  text-white"
      >
        <IoMdSwap className="rotate-90 text-[20px]" />
      </div>
    </div>
  );
}
