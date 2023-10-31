import ExternalLink from "components/ExternalLink/ExternalLink";
import Tooltip from "components/Tooltip/Tooltip";
import { BigNumber } from "ethers";
import { formatAmount } from "lib/numbers";
import { useCallback } from "react";

export function AprInfo({ apr, incentiveApr }: { apr: BigNumber | undefined; incentiveApr: BigNumber | undefined }) {
  //   if (apr && incentiveApr && incentiveApr.gt(0)) {
  //     return (

  //     );
  //   } else {
  //     const someApr = apr ?? incentiveApr;
  //     return <>{someApr ? `${formatAmount(someApr, 2, 2)}%` : "..."}</>;
  //   }
  const totalApr = apr?.add(incentiveApr ?? 0) ?? BigNumber.from(0);
  const aprNode = <>{formatAmount(totalApr, 2, 2)}%</>;
  const renderTooltipContent = useCallback(() => {
    return (
      <>
        <div>Base APR: {formatAmount(apr, 2, 2)}%</div>
        <div>Bonus APR: {formatAmount(incentiveApr, 2, 2)}%</div>
        <p>
          Bonus APR is estimated as airdropped ARB tokens. <ExternalLink href="#FIXME">Read more</ExternalLink>.
        </p>
      </>
    );
  }, [apr, incentiveApr]);
  return incentiveApr && incentiveApr.gt(0) ? (
    <Tooltip handle={aprNode} position="right-bottom" renderContent={renderTooltipContent} />
  ) : (
    aprNode
  );
}
