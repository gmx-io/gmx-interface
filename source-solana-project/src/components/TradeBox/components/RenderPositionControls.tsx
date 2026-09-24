import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { MarketSelector } from '@/components/Selectors/MarketSelector';
import { LeverageSlider } from '@/components/TradeBox/LeverageSlider/LeverageSlider';
import { CollateralSelectorRow } from '@/components/TradeBox/TradeBoxRows/CollateralSelectorRow';
import { MarketPoolSelectorRow } from '@/components/TradeBox/TradeBoxRows/MarketPoolSelectorRow';
import { BN_ZERO, ONE_BPS } from '@/config/constants';
import { DEFAULT_LEVERAGE } from '@/config/factors';
import { selectMarketTokensStat } from '@/selectors/stats/selectMarketTokensStat';
import { selectSortedAllMarkets } from '@/selectors/token/selectSortedAllMarkets';
import {
  selectSetTradeboxCollateralTokenAddress,
  selectSetTradeboxIsLeverageEnabled,
  selectSetTradeboxMarketTokenAddress,
  selectSetTradeboxToTokenAddress,
  selectSetTradeboxTradeLeverage,
  selectTradeboxIsLeverageEnabled,
  selectTradeboxTradeLeverage,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxLeverageSliderMarks } from '@/selectors/tradebox/selectTradeboxLeverageSliderMarks';
import { selectTradeboxMarketInfo } from '@/selectors/tradebox/selectTradeboxMarketInfo';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { ChangeEvent, useCallback, useRef } from 'react';
import { NumberInput } from '@/components/Common/Input/NumberInput';

export function RenderPositionControls() {
  const { isIncrease, isTrigger, isLong, isMarket } = useAppStore(
    selectTradeboxTradeFlags
  );
  const isLeverageEnabled = useAppStore(selectTradeboxIsLeverageEnabled);
  const setIsLeverageEnabled = useAppStore(selectSetTradeboxIsLeverageEnabled);
  const leverageSliderMarks = useAppStore(selectTradeboxLeverageSliderMarks);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const marketInfo = useAppStore(selectTradeboxMarketInfo);
  const setMarketAddress = useAppStore(selectSetTradeboxMarketTokenAddress);
  const toToken = useAppStore(selectTradeboxToToken);
  const setToTokenAddress = useAppStore(selectSetTradeboxToTokenAddress);
  const setCollateralTokenAddress = useAppStore(
    selectSetTradeboxCollateralTokenAddress
  );
  const sortedAllMarkets = useAppStore(selectSortedAllMarkets);
  const leverageRaw = useAppStore(selectTradeboxTradeLeverage);
  const setLeverage = useAppStore(selectSetTradeboxTradeLeverage);
  const leverage = leverageRaw ? leverageRaw : DEFAULT_LEVERAGE;
  const leverageNumber = leverage.div(ONE_BPS).toNumber() / 10000;

  const setLeverageNumber = useCallback(
    (value: number) => setLeverage(new BN(value * 10000).mul(ONE_BPS)),
    [setLeverage]
  );

  const marketsStat = useAppStore(selectMarketTokensStat);
  const marketAddress = useAppStore(selectTradeboxMarketTokenAddress);
  const marketStat = marketAddress
    ? marketsStat[marketAddress.toString()]
    : undefined;
  const { longMarketAvailableLiquidity, shortMarketAvailableLiquidity } =
    marketStat ?? {};

  const isOutPositionLiquidity = isLong
    ? (longMarketAvailableLiquidity?.lt(
        increaseAmounts?.sizeDeltaUsd || BN_ZERO
      ) ?? false)
    : (shortMarketAvailableLiquidity?.lt(
        increaseAmounts?.sizeDeltaUsd || BN_ZERO
      ) ?? false);

  const handleSelectMarket = useCallback(
    (tokenAddress: string) => setToTokenAddress(tokenAddress),
    [setToTokenAddress]
  );

  const inputRef = useRef<HTMLInputElement>(null);

  function onUserInput(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value)
    value >=0 && setLeverageNumber(value)
  }

  return (
    <>
      {isIncrease && (
        <>
          {isLeverageEnabled ? (
            <div className="LeverageSlider-container">
              <LeverageSlider
                isPositive={isLong}
                value={leverageNumber}
                onChange={setLeverageNumber}
                marks={leverageSliderMarks}
              />
              <div className='w-[5.6rem] py-[0.75rem] pr-[0.8rem] rounded-[0.8rem] flex items-end justify-end text-right bg-[#1F1F1F]'>
                <NumberInput
                  value={leverageNumber}
                  className="Exchange-swap-input"
                  inputRef={inputRef}
                  onValueChange={onUserInput}
                  placeholder="0.0"
                /><span className='text-[#323232]'>x</span>
              </div>
              {/* <ToggleSwitch
                className="Exchange-leverage-slider-settings"
                isChecked={isLeverageEnabled}
                setIsChecked={setIsLeverageEnabled}
              /> */}
            </div>
          ) : (
            <ToggleSwitch
              className="Exchange-leverage-slider-settings"
              isChecked={isLeverageEnabled ?? false}
              setIsChecked={setIsLeverageEnabled}
            >
              <span className="Exchange-info-label">
                <Trans>Leverage slider</Trans>
              </span>
            </ToggleSwitch>
          )}
        </>
      )}
      {isTrigger && (
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Market`}
          value={
            <MarketSelector
              label={t`Market`}
              className=""
              selectedIndexName={
                toToken
                  ? getMarketIndexName({
                      indexToken: toToken,
                      isSpotOnly: false,
                    })
                  : undefined
              }
              markets={sortedAllMarkets ?? []}
              onSelectMarket={handleSelectMarket}
              size="m"
              showIcon={false}
            />
          }
        />
      )}

      {marketInfo && (
        <MarketPoolSelectorRow
          selectedMarket={marketInfo}
          indexToken={toToken}
          isOutPositionLiquidity={isOutPositionLiquidity}
          currentPriceImpactBps={increaseAmounts?.acceptablePriceDeltaBps}
          onSelectMarketAddress={setMarketAddress}
        />
      )}

      <CollateralSelectorRow
        selectedMarketAddress={marketInfo?.marketTokenAddress?.toString()}
        onSelectCollateralAddress={setCollateralTokenAddress}
        isMarket={isMarket}
      />
    </>
  );
}
