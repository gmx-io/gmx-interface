import { t, Trans } from "@lingui/macro";
import { Fragment, useCallback } from "react";
import { useCopyToClipboard } from "react-use";

import { RebateDistribution } from "domain/referrals";
import { helperToast } from "lib/helperToast";
import { getToken } from "sdk/configs/tokens";

import { Amount } from "components/Amount/Amount";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import NewCheckedIcon from "img/ic_new_checked.svg?react";

import { DistributionTimestamp } from "./DistributionTimestamp";
import { type AmountsByTokens } from "./RebateDistributionRow";

type RebateDistributionRowDetailProps = {
  rebate: RebateDistribution;
  chainId: number;
  amountsByTokens: AmountsByTokens;
};

export function RebateDistributionRowDetail({ rebate, chainId, amountsByTokens }: RebateDistributionRowDetailProps) {
  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopyTxHash = useCallback(
    (hash: string) => {
      copyToClipboard(hash);
      helperToast.success(t`Transaction hash copied to clipboard`);
    },
    [copyToClipboard]
  );

  return (
    <div className="col-span-full grid grid-cols-subgrid rounded-b-8 text-[13px]">
      <div className="py-8 pl-20 text-typography-secondary">
        <Trans>Status</Trans>
      </div>
      <div className="col-span-4 py-8 pr-20">
        <span className="inline-flex items-center gap-2 rounded-full bg-green-900 py-2 pl-4 pr-6 text-green-500">
          <NewCheckedIcon className="size-16 text-green-500" />
          <Trans>Success</Trans>
        </span>
      </div>

      {Object.keys(amountsByTokens).map((tokenAddress) => {
        const token = getToken(chainId, tokenAddress);
        return (
          <Fragment key={tokenAddress}>
            <div className="py-8 pl-20 text-typography-secondary">
              <Trans>{token.symbol} Amount</Trans>
            </div>
            <div className="col-span-4 py-8 pr-20">
              <Amount
                amount={amountsByTokens[tokenAddress]}
                decimals={token.decimals}
                isStable={token.isStable}
                symbol={token.symbol}
                symbolClassName="text-typography-secondary"
              />
            </div>
          </Fragment>
        );
      })}

      <div className="py-8 pl-20 text-typography-secondary">
        <Trans>Transaction hash</Trans>
      </div>
      <div className="col-span-4 flex items-center gap-8 py-8 pr-20">
        {rebate.transactionHash}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyTxHash(rebate.transactionHash);
          }}
          className="text-typography-secondary hover:text-typography-primary"
        >
          <CopyStrokeIcon className="size-16" />
        </button>
      </div>

      <div className="py-8 pl-20 text-typography-secondary">
        <Trans>Timestamp</Trans>
      </div>
      <div className="col-span-4 py-8 pr-20">
        <DistributionTimestamp timestamp={rebate.timestamp} />
      </div>
    </div>
  );
}
