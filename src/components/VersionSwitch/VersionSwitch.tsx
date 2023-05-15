import cx from "classnames";
import "./VersionSwitch.scss";
import { useChainId } from "lib/chains";
import { getIsSyntheticsSupported } from "config/features";

type Props = {
  currentVersion: number;
  setCurrentVersion: (version: number) => void;
};

export function VersionSwitch({ currentVersion, setCurrentVersion }: Props) {
  const { chainId } = useChainId();

  if (!getIsSyntheticsSupported(chainId)) {
    return null;
  }

  return (
    <div className="VersionSwitch">
      <div
        className={cx("VersionSwitch-option", { active: currentVersion === 1 })}
        onClick={() => setCurrentVersion(1)}
      >
        V1
      </div>
      <div
        className={cx("VersionSwitch-option", { active: currentVersion === 2 })}
        onClick={() => setCurrentVersion(2)}
      >
        V2
      </div>
    </div>
  );
}
