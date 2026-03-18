import { t, Trans } from "@lingui/macro";
import { motion } from "framer-motion";
import { Fragment, useCallback } from "react";
import { useCopyToClipboard } from "react-use";
import useSWR from "swr";

import { RebateDistribution } from "domain/referrals";
import { helperToast } from "lib/helperToast";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { getToken } from "sdk/configs/tokens";

import { Amount } from "components/Amount/Amount";

import CloseIcon from "img/ic_close.svg?react";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import NewCheckedIcon from "img/ic_new_checked.svg?react";

import { DistributionTimestamp } from "./DistributionTimestamp";
import { type AmountsByTokens } from "./RebateDistributionRow";

const DETAIL_ROW_VARIANTS = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1 },
} as const;

const DETAIL_ROW_TRANSITION = { duration: 0.22, ease: "easeInOut" } as const;

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

  const { data: status } = useSWR<"success" | "failed" | null>(
    ["tx-receipt", chainId, rebate.transactionHash],
    async () => {
      const receipt = await getPublicClientWithRpc(chainId).getTransactionReceipt({
        hash: rebate.transactionHash,
      });
      return receipt?.status === "success" ? "success" : "failed";
    }
  );

  return (
    <motion.div
      className="col-span-full grid grid-cols-subgrid overflow-hidden rounded-b-8 text-[13px]"
      variants={DETAIL_ROW_VARIANTS}
      initial="collapsed"
      animate="expanded"
      exit="collapsed"
      transition={DETAIL_ROW_TRANSITION}
    >
      <div className="py-8 pl-adaptive text-typography-secondary">
        <Trans>Status</Trans>
      </div>
      <div className="col-span-4 flex h-38 items-center py-8 pr-adaptive">
        {status === "success" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-green-900 py-2 pl-4 pr-6 text-green-500">
            <NewCheckedIcon className="size-16 text-green-500" />
            <Trans>Success</Trans>
          </span>
        )}
        {status === "failed" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-900 py-2 pl-4 pr-6 text-red-500">
            <CloseIcon className="size-16 text-red-500" />
            <Trans>Failed</Trans>
          </span>
        )}
        {!status && <div>...</div>}
      </div>

      {Object.keys(amountsByTokens).map((tokenAddress) => {
        const token = getToken(chainId, tokenAddress);
        return (
          <Fragment key={tokenAddress}>
            <div className="py-8 pl-adaptive text-typography-secondary">
              <Trans>{token.symbol} Amount</Trans>
            </div>
            <div className="col-span-4 py-8 pr-adaptive">
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

      <div className="py-8 pl-adaptive text-typography-secondary">
        <Trans>Transaction hash</Trans>
      </div>
      <div className="col-span-4 flex items-center gap-8 py-8 pr-adaptive">
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

      <div className="py-8 pl-adaptive text-typography-secondary">
        <Trans>Timestamp</Trans>
      </div>
      <div className="col-span-4 py-8 pr-adaptive">
        <DistributionTimestamp timestamp={rebate.timestamp} />
      </div>
    </motion.div>
  );
}
