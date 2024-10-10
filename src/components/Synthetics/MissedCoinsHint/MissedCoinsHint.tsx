import { Trans } from "@lingui/macro";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import cx from "classnames";
import { selectSetMissedCoinsModalPlace } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";

export function MissedCoinsHint({
  place,
  className,
  withIcon,
}: {
  place: MissedCoinsPlace;
  className?: string;
  withIcon?: boolean;
}) {
  const setMissedCoinsModalPlace = useSelector(selectSetMissedCoinsModalPlace);

  const text = <Trans>Can’t find the coin you need? Let us know</Trans>;

  if (!withIcon) {
    return <div className={cx(className, "cursor-pointer", "underline")}>{text}</div>;
  }

  return (
    <AlertInfo
      type="info"
      className={cx(className, "cursor-pointer", "underline")}
      onClick={() => setMissedCoinsModalPlace(place)}
      noMargin
    >
      <div className="pl-4">{text}</div>
    </AlertInfo>
  );
}
