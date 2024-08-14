import { IoMdSwap } from "react-icons/io";

export function Swap({ onSwitchSide }: { onSwitchSide: () => void }) {
  return (
    <div className="AppOrder-ball-container" onClick={onSwitchSide}>
      <div className="AppOrder-ball">
        <IoMdSwap className="Exchange-swap-ball-icon" />
      </div>
    </div>
  );
}
