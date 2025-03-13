import { Trans } from "@lingui/macro";
import { useState, useEffect } from "react";
import Button from "components/Button/Button";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { formatAmount } from "lib/numbers";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

type Props = {
  isVisible: boolean;
};

export default function OldSubaccountWithdraw({ isVisible }: Props) {
  return null;
  const { account, active } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [oldSubaccountAddress, setOldSubaccountAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mock function to get the old subaccount address
  // In a real implementation, this would come from your backend or a contract call
  const getOldSubaccountAddress = async (mainAccount: string) => {
    // This is a mock implementation - replace with actual logic
    // Use a simplified calculation for the demo
    return `0x${mainAccount.slice(2, 6)}1CT${mainAccount.slice(10, 42)}`;
  };

  // Mock function to get the balance of WETH in the old subaccount
  // In a real implementation, this would be a contract call to the WETH contract
  const getWethBalance = async (subaccountAddress: string) => {
    // This is a mock implementation - replace with actual call to WETH contract
    // For now, let's return a small amount to simulate a remaining balance
    return "0.0008644876";
  };

  const loadSubaccountInfo = async () => {
    if (!account || !active) {
      setBalance(null);
      setOldSubaccountAddress(null);
      return;
    }

    try {
      setIsLoading(true);
      const subaccountAddress = await getOldSubaccountAddress(account);
      setOldSubaccountAddress(subaccountAddress);

      const wethBalance = await getWethBalance(subaccountAddress);
      setBalance(wethBalance);
    } catch (error) {
      console.error("Error loading subaccount info:", error);
      helperToast.error("Failed to load subaccount information");
    } finally {
      setIsLoading(false);
    }
  };

  // Mock function to withdraw WETH from the old subaccount
  // In a real implementation, this would be a transaction to withdraw funds
  const withdrawWeth = async () => {
    if (!account || !active || !oldSubaccountAddress || !balance) {
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

  useEffect(() => {
    if (isVisible) {
      loadSubaccountInfo();
    }
  }, [isVisible, account, active]);

  if (!isVisible || !balance || parseFloat(balance) === 0) {
    return null;
  }

  return (
    <div className="rounded-lg mt-16 bg-slate-800 p-16">
      <div className="flex items-center">
        <div className="text-warning flex items-center">
          <span className="mr-8">⚠️</span>
          <span>
            <Trans>You have {formatAmount(balance, 18, 8)} ETH remaining in your old version 1CT subaccount.</Trans>
          </span>
        </div>
      </div>
      <div className="mt-12">
        <Button
          variant="secondary"
          className="w-full"
          onClick={withdrawWeth}
          disabled={isWithdrawing || parseFloat(balance) === 0}
        >
          {isWithdrawing ? <Trans>Withdrawing...</Trans> : <Trans>Withdraw</Trans>}
        </Button>
      </div>
    </div>
  );
}
