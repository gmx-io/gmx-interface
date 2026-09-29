import { USD_DECIMALS } from "config/factors";
import { getPaxosTransitConfig } from "config/paxosTransit";
import { selectPoolsDetailsUsdcUsdgSwapLiquidity } from "context/PoolsDetailsContext/selectors";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectSetDebugSwapMarketsConfig,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatBalanceAmount, formatUsd } from "lib/numbers";

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
