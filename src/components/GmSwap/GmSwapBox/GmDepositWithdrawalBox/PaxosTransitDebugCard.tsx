import { USD_DECIMALS } from "config/factors";
import { getPaxosTransitConfig } from "config/paxosTransit";
import {
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsUsdcUsdgSwapLiquidity,
} from "context/PoolsDetailsContext/selectors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectSetDebugSwapMarketsConfig,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { mockTransitApi } from "domain/synthetics/paxosTransit/mockTransitApi";
import type { TransitRouteDirection } from "domain/synthetics/paxosTransit/transitRouteProgress";
import type { TokenData } from "domain/synthetics/tokens";
import { expandDecimals, formatAmount, formatBalanceAmount, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export function PaxosTransitDebugCard({
  zeroFeeCapacity,
  usdgToken,
  isWhitelistIgnored,
  setIsWhitelistIgnored,
  isMocked,
  setIsMocked,
  isBuyUsdgHintForced,
  setIsBuyUsdgHintForced,
  thresholdUsdInput,
  setThresholdUsdInput,
}: {
  zeroFeeCapacity: bigint | undefined;
  usdgToken: TokenData | undefined;
  isWhitelistIgnored: boolean;
  setIsWhitelistIgnored: (value: boolean) => void;
  isMocked: boolean;
  setIsMocked: (value: boolean) => void;
  isBuyUsdgHintForced: boolean;
  setIsBuyUsdgHintForced: (value: boolean) => void;
  thresholdUsdInput: string;
  setThresholdUsdInput: (value: string) => void;
}) {
  const poolLiquidity = useSelector(selectPoolsDetailsUsdcUsdgSwapLiquidity);
  const chainId = useSelector(selectChainId);
  const glvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const debugSwapMarketsConfig = useSelector(selectDebugSwapMarketsConfig);
  const setDebugSwapMarketsConfig = useSelector(selectSetDebugSwapMarketsConfig);
  const { account } = useWallet();
  const { startTransitRouteProgress } = useSyntheticsEvents();

  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const disabledSwapMarkets = debugSwapMarketsConfig?.disabledSwapMarkets ?? [];
  const isSwapMarketDisabled =
    paxosTransitConfig !== undefined && disabledSwapMarkets.includes(paxosTransitConfig.swapMarketAddress);
  const setIsSwapMarketDisabled = (isDisabled: boolean) => {
    if (!paxosTransitConfig) return;

    const otherMarkets = disabledSwapMarkets.filter((market) => market !== paxosTransitConfig.swapMarketAddress);

    setDebugSwapMarketsConfig({
      ...debugSwapMarketsConfig,
      disabledSwapMarkets: isDisabled ? [...otherMarkets, paxosTransitConfig.swapMarketAddress] : otherMarkets,
    });
  };

  const showMockTransitToast = (direction: TransitRouteDirection, isConverting: boolean) => {
    if (!paxosTransitConfig || !glvOrMarketAddress || !account) return;

    const { usdcAddress, usdgAddress } = paxosTransitConfig;
    const [offerAsset, wantAsset] =
      direction === "usdcToUsdg" ? [usdcAddress, usdgAddress] : [usdgAddress, usdcAddress];
    const offerToken = getToken(chainId, offerAsset);
    const offerAmount = expandDecimals(1_000, offerToken.decimals);
    const orderId = isConverting
      ? mockTransitApi.submitOrder({
          userAddress: account,
          offerAsset,
          wantAsset,
          offerAmount,
          sourceChainId: chainId,
          destinationChainId: chainId,
          feeTier: "zeroFee",
        })
      : undefined;

    startTransitRouteProgress({
      chainId,
      account,
      direction,
      glvOrMarketAddress,
      withdrawalTxnHash: undefined,
      conversion: orderId ? { orderId, txnHash: undefined, offerAmount, isMocked: true } : undefined,
    });
  };

  return (
    <div className="flex w-full flex-col gap-14 rounded-8 bg-slate-900 p-12">
      <ToggleSwitch isChecked={isMocked} setIsChecked={setIsMocked}>
        Mock Transit gateway, no real conversion
      </ToggleSwitch>
      <ToggleSwitch isChecked={isWhitelistIgnored} setIsChecked={setIsWhitelistIgnored}>
        Act as non-whitelisted for Transit
      </ToggleSwitch>
      <ToggleSwitch isChecked={isSwapMarketDisabled} setIsChecked={setIsSwapMarketDisabled}>
        Disable USDC-USDG swap pool
      </ToggleSwitch>
      <ToggleSwitch isChecked={isBuyUsdgHintForced} setIsChecked={setIsBuyUsdgHintForced}>
        Show the Buy USDG hint
      </ToggleSwitch>
      <div className="flex flex-wrap gap-8">
        <Button variant="secondary" onClick={() => showMockTransitToast("usdcToUsdg", true)}>
          Buy toast
        </Button>
        <Button variant="secondary" onClick={() => showMockTransitToast("usdgToUsdc", false)}>
          Sell toast
        </Button>
        <Button variant="secondary" onClick={() => showMockTransitToast("usdgToUsdc", true)}>
          Sell converting toast
        </Button>
      </div>
      <SyntheticsInfoRow
        label="Transit size threshold, $"
        value={
          <NumberInput
            className="w-120 rounded-4 border border-gray-700 px-8 py-4 text-right numbers"
            value={thresholdUsdInput}
            onValueChange={(e) => setThresholdUsdInput(e.target.value)}
            placeholder={
              paxosTransitConfig ? formatAmount(paxosTransitConfig.thresholdUsd, USD_DECIMALS, 0) : undefined
            }
            maxDecimals={2}
          />
        }
      />
      <SyntheticsInfoRow
        label="Transit zero-fee capacity"
        valueClassName="numbers"
        value={
          zeroFeeCapacity !== undefined && usdgToken
            ? formatBalanceAmount(zeroFeeCapacity, usdgToken.decimals, usdgToken.symbol)
            : "-"
        }
      />
      <SyntheticsInfoRow
        label="Pool max USDC → USDG"
        valueClassName="numbers"
        value={poolLiquidity ? formatUsd(poolLiquidity.usdcToUsdgUsd) : "-"}
      />
      <SyntheticsInfoRow
        label="Pool max USDG → USDC"
        valueClassName="numbers"
        value={poolLiquidity ? formatUsd(poolLiquidity.usdgToUsdcUsd) : "-"}
      />
    </div>
  );
}
