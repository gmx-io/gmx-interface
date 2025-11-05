import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useState } from "react";

import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useGmxAccountFundingHistoryItem } from "domain/multichain/useGmxAccountFundingHistory";
import { userAnalytics } from "lib/userAnalytics";
import { OneClickPromotionEvent } from "lib/userAnalytics/types";
import { getToken } from "sdk/configs/tokens";

import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";

import CheckCircleIcon from "img/ic_check_circle.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";
import SpinnerBlueIcon from "img/ic_spinner_blue.svg?react";
import OneClickCoinImage from "img/one_click_coin.png";

const StatusBadge = ({ variant }: { variant: "loading" | "success" }) => {
  return variant === "loading" ? (
    <SpinnerBlueIcon className="size-16 animate-spin" />
  ) : (
    <CheckCircleIcon className="size-16 text-green-500" />
  );
};

export const DepositStatusView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();
  const transfer = useGmxAccountFundingHistoryItem(selectedTransferGuid, {
    refetch: Boolean(selectedTransferGuid),
  });
  const [isSubaccountActivating, setIsSubaccountActivating] = useState(false);
  const subaccountState = useSubaccountContext();

  useEffect(() => {
    userAnalytics.pushEvent<OneClickPromotionEvent>({
      event: "OneClickPromotion",
      data: { action: "PopupShown" },
    });
  }, []);

  const onEnableOneClickClick = () => {
    userAnalytics.pushEvent<OneClickPromotionEvent>({
      event: "OneClickPromotion",
      data: { action: "EnableOneClickClicked" },
    });
    setIsSubaccountActivating(true);
    subaccountState
      .tryEnableSubaccount()
      .then((isSubaccountActivated) => {
        if (isSubaccountActivated) {
          userAnalytics.pushEvent<OneClickPromotionEvent>({
            event: "OneClickPromotion",
            data: { action: "EnableOneClickSuccess" },
          });
          setIsVisibleOrView("main");
        }
      })
      .finally(() => {
        setIsSubaccountActivating(false);
      });
  };

  const onRemindLaterClick = () => {
    userAnalytics.pushEvent<OneClickPromotionEvent>({
      event: "OneClickPromotion",
      data: { action: "UserRejected" },
    });
    setIsVisibleOrView("main");
  };

  const token = transfer ? getToken(transfer.settlementChainId, transfer.token) : undefined;
  const isCompleted = transfer?.step === "executed";
  const statusVariant: "loading" | "success" = isCompleted ? "success" : "loading";

  const description = isCompleted ? (
    <Trans>Funds are now in your GMX Account.</Trans>
  ) : (
    <Trans>Funds will appear in your GMX Account soon.</Trans>
  );
  const statusLabel = isCompleted ? <Trans>Deposit completed</Trans> : <Trans>Deposit in progress</Trans>;

  return (
    <div className="flex grow flex-col gap-12 !py-12 px-adaptive pb-adaptive">
      <div className="flex flex-col gap-4">
        <div className="text-body-medium text-typography-secondary">{description}</div>

        {token && transfer && (
          <div className="flex items-center gap-8">
            <TokenIcon symbol={token.symbol} displaySize={20} chainIdBadge={transfer.sourceChainId} />
            <div className="flex flex-col">
              <Amount
                amount={transfer.sentAmount}
                decimals={token.decimals}
                isStable={token.isStable}
                symbol={token.symbol}
                className="text-24 font-medium text-typography-primary"
              />
            </div>
          </div>
        )}
      </div>

      <div className="text-body-medium flex items-center gap-6 font-medium">
        <StatusBadge variant={statusVariant} />
        <div className={cx(isCompleted ? "text-green-500" : "text-typography-secondary")}>{statusLabel}</div>
      </div>

      <div className="mt-12 flex justify-between rounded-8 border-1/2 border-slate-600 bg-slate-950/50">
        <div className="flex flex-col gap-4 p-12">
          <h4 className="text-14 font-medium">
            <Trans>Want to trade faster with One-Click?</Trans>
          </h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-8">
              <div className="size-6 rotate-[45deg] transform rounded-1 bg-blue-300" />
              <span className="text-12 text-typography-secondary">
                <Trans>No repeated wallet confirmations</Trans>
              </span>
            </div>
            <div className="flex items-center gap-8">
              <div className="size-6 rotate-[45deg] transform rounded-1 bg-blue-300" />
              <span className="text-12 text-typography-secondary">
                <Trans>Faster execution with GMX premium RPCs</Trans>
              </span>
            </div>
            <div className="flex items-center gap-8">
              <div className="size-6 rotate-[45deg] transform rounded-1 bg-blue-300" />
              <span className="text-12 text-typography-secondary">
                <Trans>Reliable GMX-powered transactions</Trans>
              </span>
            </div>
          </div>
        </div>
        <img src={OneClickCoinImage} alt="One-Click" className="mr-6 mt-6 h-93 w-92 transform" />
      </div>
      <Button variant="primary" size="medium" onClick={onEnableOneClickClick} disabled={isSubaccountActivating}>
        {isSubaccountActivating ? <SpinnerIcon className="size-16 animate-spin" /> : null}
        <Trans>Enable One-Click Trading</Trans>
      </Button>
      <Button variant="ghost" size="medium" onClick={onRemindLaterClick}>
        <Trans>Remind me later</Trans>
      </Button>
    </div>
  );
};
