import { IoArrowDown } from "react-icons/io5";

export function Swap() {
  return (
    <div className="z-2 relative">
      <div
        className="absolute -top-19 left-1/2 flex size-36 -translate-x-1/2
                   cursor-not-allowed select-none items-center justify-center rounded-full bg-cold-blue-500
                   text-white"
      >
        <IoArrowDown size={24} />
      </div>
    </div>
  );
}
