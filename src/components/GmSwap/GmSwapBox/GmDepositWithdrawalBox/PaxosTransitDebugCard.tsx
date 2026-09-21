import { getPaxosTransitConfig } from "config/paxosTransit";
import { selectPoolsDetailsUsdcUsdgSwapLiquidity } from "context/PoolsDetailsContext/selectors";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectSetDebugSwapMarketsConfig,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { TokenData } from "domain/synthetics/tokens";
import { formatBalanceAmount, formatUsd } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export function PaxosTransitDebugCard({
  zeroFeeCapacity,
  usdgToken,
  isWhitelistIgnored,
  setIsWhitelistIgnored,
}: {
  zeroFeeCapacity: bigint | undefined;
  usdgToken: TokenData | undefined;
  isWhitelistIgnored: boolean;
  setIsWhitelistIgnored: (value: boolean) => void;
}) {
  const poolLiquidity = useSelector(selectPoolsDetailsUsdcUsdgSwapLiquidity);
  const paxosTransitConfig = getPaxosTransitConfig(useSelector(selectChainId));
  const debugSwapMarketsConfig = useSelector(selectDebugSwapMarketsConfig);
  const setDebugSwapMarketsConfig = useSelector(selectSetDebugSwapMarketsConfig);

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

  return (
    <div className="flex w-full flex-col gap-14 rounded-8 bg-slate-900 p-12">
      <ToggleSwitch isChecked={isWhitelistIgnored} setIsChecked={setIsWhitelistIgnored}>
        Act as non-whitelisted for Transit
      </ToggleSwitch>
      <ToggleSwitch isChecked={isSwapMarketDisabled} setIsChecked={setIsSwapMarketDisabled}>
        Disable USDC-USDG swap pool
      </ToggleSwitch>
      <SyntheticsInfoRow
        label="Transit size threshold"
        valueClassName="numbers"
        value={paxosTransitConfig ? formatUsd(paxosTransitConfig.minAmountUsd) : "-"}
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
