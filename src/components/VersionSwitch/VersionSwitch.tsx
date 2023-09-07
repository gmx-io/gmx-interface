import cx from "classnames";
import "./VersionSwitch.scss";
import { useChainId } from "lib/chains";
import { getIsSyntheticsSupported, getIsV1Supported } from "config/features";

type Props = {
  currentVersion: number;
  setCurrentVersion: (version: number) => void;
};

export function VersionSwitch({ currentVersion, setCurrentVersion }: Props) {
  const { chainId } = useChainId();

  return (
    <div className="VersionSwitch">
      {getIsV1Supported(chainId) && (
        <div
          className={cx("VersionSwitch-option v1", { active: currentVersion === 1 })}
          onClick={() => setCurrentVersion(1)}
        >
          V1
        </div>
      )}
      {getIsSyntheticsSupported(chainId) && (
        <div
          className={cx("VersionSwitch-option v2", { active: currentVersion === 2 })}
          onClick={() => setCurrentVersion(2)}
        >
          V2
        </div>
      )}
    </div>
  );
}
