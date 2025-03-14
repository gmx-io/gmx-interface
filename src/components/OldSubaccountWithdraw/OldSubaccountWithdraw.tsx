import { Trans } from "@lingui/macro";
import Button from "components/Button/Button";
import IconInfo from "img/ic_info.svg?react";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";
import { useState } from "react";

type Props = {
  isVisible: boolean;
};

export function OldSubaccountWithdraw({ isVisible }: Props) {
  const { account } = useWallet();
  const [balance, setBalance] = useState<string | null>("0.0008644876"); // Hardcoded for demo
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Simulated function for withdrawing ETH from the old subaccount
  const withdrawWeth = async () => {
    if (!account || !balance) {
      return;
    }

    try {
      setIsWithdrawing(true);
      // This is a mock implementation - replace with actual withdrawal logic
      // In reality, this would involve sending a transaction

      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      helperToast.success("Successfully withdrew WETH from old subaccount");
      setBalance("0");
    } catch (error) {
      console.error("Error withdrawing WETH:", error);
      helperToast.error("Failed to withdraw WETH from old subaccount");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isVisible || !balance || parseFloat(balance) === 0) {
    return null;
  }

  return (
    <div className="relative flex items-center rounded-4 border-l-2 border-l-slate-100 bg-slate-600 px-8 py-8">
      <div className="mr-12 w-16">
        <IconInfo className="absolute top-12" />
      </div>
      <div className="pr-8 text-12">
        <Trans>You have {balance} ETH remaining in your old version 1CT subaccount.</Trans>
        <br />
        <Button variant="link" className="mt-8 !text-12" onClick={withdrawWeth} disabled={isWithdrawing}>
          <Trans>Withdraw</Trans>
        </Button>
      </div>
      <div className="flex gap-8"></div>
    </div>
  );
}
