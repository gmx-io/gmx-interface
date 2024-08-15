import { IoMdSwap } from "react-icons/io";

export function Swap() {
  return (
    <div className="z-2 relative">
      <div
        className="absolute -top-25 left-1/2 ml-[-17.825px]
                   flex size-35 cursor-not-allowed select-none items-center justify-center rounded-31
                  bg-blue-600 text-white opacity-80"
      >
        <IoMdSwap className="rotate-90 text-[20px] opacity-80" />
      </div>
    </div>
  );
}
