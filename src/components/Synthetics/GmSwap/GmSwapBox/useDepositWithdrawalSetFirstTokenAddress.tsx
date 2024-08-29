import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "@/config/localStorage";
import { useLocalStorageSerializeKey } from "@/lib/localStorage";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

export const useDepositWithdrawalSetFirstTokenAddress = (isDeposit: boolean, marketAddress?: string) => {
  const chainId = useSelector(selectChainId);

  return useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, marketAddress, "first"],
    undefined
  );
};
