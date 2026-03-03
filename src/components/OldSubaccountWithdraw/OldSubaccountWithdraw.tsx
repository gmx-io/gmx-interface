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

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { StatusNotification } from "components/StatusNotification/StatusNotification";
import { TransactionStatus } from "components/TransactionStatus/TransactionStatus";

import IconInfo from "img/ic_info.svg?react";

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

      helperToast.info(
        <StatusNotification title={t`Withdrawing from subaccount...`}>
          <TransactionStatus status="loading" text={t`Withdrawing ${balanceFormatted} to main account...`} />
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
        <StatusNotification title={t`Withdrawn from subaccount`}>
          {t`Withdrawn ${balanceFormatted} to main account`}
        </StatusNotification>
      );

      setIsVisible(false);
    } catch (error) {
      metrics.pushError(error, "subaccount.withdrawOldBalance");
      helperToast.error(
        <StatusNotification title={t`Withdrawal from subaccount`}>
          {t`Withdrawal of ${balanceFormatted} failed`}
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
    <ColorfulBanner color="blue" icon={IconInfo} onClose={() => setIsVisible(false)}>
      <Trans>{balanceFormatted} remaining in old 1CT subaccount</Trans>
      <ColorfulButtonLink color="blue" onClick={withdrawWeth} disabled={isWithdrawing}>
        {isWithdrawing ? <Trans>Withdrawing...</Trans> : <Trans>Withdraw</Trans>}
      </ColorfulButtonLink>
    </ColorfulBanner>
  );
}
