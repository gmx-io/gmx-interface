import { t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useGasPrice } from "domain/synthetics/fees/useGasPrice";
import {
  useSubaccountWithdrawalAmount,
  withdrawFromSubaccount,
} from "domain/synthetics/subaccount/withdrawFromSubaccount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatTokenAmount } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import useWallet from "lib/wallets/useWallet";
import { getNativeToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { StatusNotification } from "components/Synthetics/StatusNotification/StatusNotification";
import { TransactionStatus } from "components/TransactionStatus/TransactionStatus";

import IconInfo from "img/ic_info.svg?react";

import "./OldSubaccountWithdraw.scss";

export function OldSubaccountWithdraw() {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const nativeToken = getNativeToken(chainId);
  const [isVisible, setIsVisible] = useState(true);
  const { subaccountConfig } = useSubaccountContext();
  const gasPrice = useGasPrice(chainId);
  const { provider } = useJsonRpcProvider(chainId);

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const estimatedWithdrawalAmounts = useSubaccountWithdrawalAmount(chainId, subaccountConfig?.address, gasPrice);

  const balanceFormatted = formatTokenAmount(
    estimatedWithdrawalAmounts?.amountToSend ?? 0n,
    nativeToken.decimals,
    nativeToken.symbol,
    {
      showAllSignificant: true,
    }
  );

  const withdrawWeth = useCallback(async () => {
    if (!account || !subaccountConfig?.address || gasPrice === undefined || !provider) {
      return;
    }

    try {
      setIsWithdrawing(true);

      helperToast.success(
        <StatusNotification title={t`Withdrawing from subaccount`}>
          <TransactionStatus status="loading" text={t`Withdrawing ${balanceFormatted} to main account`} />
        </StatusNotification>,
        {
          className: "SubaccountNotification",
        }
      );

      await withdrawFromSubaccount({
        mainAccountAddress: account,
        subaccountConfig,
        gasPrice,
        provider,
      });

      helperToast.success(
        <StatusNotification title={t`Withdrawing from subaccount`}>
          {t`Withdrawn ${balanceFormatted} to main account.`}
        </StatusNotification>
      );

      setIsVisible(false);
    } catch (error) {
      metrics.pushError(error, "subaccount.withdrawOldBalance");
      helperToast.error(
        <StatusNotification title={t`Withdrawing from subaccount`}>
          {t`Failed to withdraw ${balanceFormatted} to main account.`}
        </StatusNotification>
      );
    } finally {
      setIsWithdrawing(false);
    }
  }, [account, subaccountConfig, gasPrice, provider, balanceFormatted]);

  if (
    !isVisible ||
    estimatedWithdrawalAmounts?.amountToSend === undefined ||
    estimatedWithdrawalAmounts?.amountToSend === 0n
  ) {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={IconInfo}>
      <Trans>You have {balanceFormatted} remaining in your old version 1CT subaccount.</Trans>
      <br />
      <Button variant="link" className="mt-8 !text-12" onClick={withdrawWeth} disabled={isWithdrawing}>
        {isWithdrawing ? <Trans>Withdrawing</Trans> : <Trans>Withdraw</Trans>}
      </Button>
    </ColorfulBanner>
  );
}
