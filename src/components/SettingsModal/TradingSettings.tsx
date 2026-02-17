import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useAccount } from "wagmi";

import { ARBITRUM, AVALANCHE, BOTANIX, getChainName } from "config/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { getIsExpressSupported } from "config/features";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING } from "config/multichain";
import { DEFAULT_TIME_WEIGHTED_NUMBER_OF_PARTS } from "config/twap";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { SettlementChainWarningContainer } from "domain/multichain/SettlementChainWarningContainer";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useIsOutOfGasPaymentBalance } from "domain/synthetics/express/useIsOutOfGasPaymentBalance";
import { getIsSubaccountActive } from "domain/synthetics/subaccount";
import { useChainId } from "lib/chains";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";
import { EMPTY_ARRAY } from "lib/objects";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import { useIsGeminiWallet } from "lib/wallets/useIsGeminiWallet";
import { getNativeToken } from "sdk/configs/tokens";

import { CollateralDestinationSelector } from "components/CollateralDestinationSelector/CollateralDestinationSelector";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import { ExpressTradingOutOfGasBanner } from "components/ExpressTradingOutOfGasBanner/ExpressTradingOutOfGasBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GasPaymentTokenSelector } from "components/GasPaymentTokenSelector/GasPaymentTokenSelector";
import { OldSubaccountWithdraw } from "components/OldSubaccountWithdraw/OldSubaccountWithdraw";
import { OneClickAdvancedSettings } from "components/OneClickAdvancedSettings/OneClickAdvancedSettings";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ExpressIcon from "img/ic_express.svg?react";
import HourGlassIcon from "img/ic_hourglass.svg?react";
import OneClickIcon from "img/ic_one_click.svg?react";

import { Chip, InputSetting, SettingButton, SettingsSection, TradingMode } from "./shared";

interface TradingSettingsProps {
  tradingMode: TradingMode | undefined;
  handleTradingModeChange: (mode: TradingMode) => void;
  onChangeSlippage: (value: number) => void;
  onChangeExecutionFeeBufferBps: (value: number) => void;
  onChangeTwapNumberOfParts: (value: number) => void;
  onBlurTwapNumberOfParts: () => void;
  numberOfParts: number | undefined;
  onClose: () => void;
}

export function TradingSettings({
  tradingMode,
  handleTradingModeChange,
  onChangeSlippage,
  onChangeExecutionFeeBufferBps,
  onChangeTwapNumberOfParts,
  onBlurTwapNumberOfParts,
  numberOfParts,
  onClose,
}: TradingSettingsProps) {
  const { chainId, srcChainId } = useChainId();
  const { isConnected } = useAccount();
  const settings = useSettings();
  const subaccountState = useSubaccountContext();
  const isOutOfGasPaymentBalance = useIsOutOfGasPaymentBalance();
  const isGeminiWallet = useIsGeminiWallet();
  const [settlementChainId, setSettlementChainId] = useGmxAccountSettlementChainId();
  const { isNonEoaAccountOnAnyChain } = useIsNonEoaAccountOnAnyChain();
  const { emptyGmxAccounts } = useEmptyGmxAccounts([AVALANCHE]);
  const isAvalancheEmpty = emptyGmxAccounts?.[AVALANCHE] === true;
  const isExpressTradingDisabled =
    (isOutOfGasPaymentBalance && srcChainId === undefined) || isNonEoaAccountOnAnyChain || isGeminiWallet;
  const nativeTokenSymbol = getNativeToken(chainId).symbol;
  const { gasPaymentTokensText } = useGasPaymentTokensText(chainId);

  const handleSelectGasPaymentToken = useCallback(
    (tokenAddress: string) => {
      settings.setGasPaymentTokenAddress(tokenAddress);
      window.dispatchEvent(new CustomEvent("gasPaymentTokenChanged"));
    },
    [settings]
  );

  return (
    <div>
      {getIsExpressSupported(chainId) && (
        <>
          <SettingsSection>
            <div className="text-14 font-medium text-typography-primary">
              <Trans>Trading Mode</Trans>
            </div>
            {!srcChainId && (
              <SettingButton
                title={<Trans>Classic</Trans>}
                description={<Trans>On-chain signing for every transaction.</Trans>}
                info={
                  <Trans>
                    You sign each transaction on-chain using your own RPC, typically provided by your wallet. Gas
                    payments in {nativeTokenSymbol}.
                  </Trans>
                }
                icon={<HourGlassIcon className="size-28" />}
                active={tradingMode === TradingMode.Classic}
                onClick={() => handleTradingModeChange(TradingMode.Classic)}
              />
            )}

            <SettingButton
              title={<Trans>Express</Trans>}
              description={<Trans>High execution reliability using premium RPCs.</Trans>}
              info={
                <Trans>
                  You sign each transaction off-chain. Trades use GMX-sponsored premium RPCs for reliability, even
                  during network congestion. Gas payments in {gasPaymentTokensText}.
                </Trans>
              }
              icon={<ExpressIcon className="size-28" />}
              disabled={isExpressTradingDisabled}
              disabledTooltip={
                isNonEoaAccountOnAnyChain || isGeminiWallet ? (
                  <Trans>Smart wallets are not supported on Express or One-Click Trading.</Trans>
                ) : undefined
              }
              chip={
                <Chip color="gray">
                  <Trans>Optimal</Trans>
                </Chip>
              }
              active={tradingMode === TradingMode.Express}
              onClick={() => handleTradingModeChange(TradingMode.Express)}
            />

            <SettingButton
              title={<Trans>Express + One-Click</Trans>}
              description={<Trans>CEX-like experience with Express reliability.</Trans>}
              icon={<OneClickIcon className="size-28" />}
              disabled={isExpressTradingDisabled}
              disabledTooltip={
                isNonEoaAccountOnAnyChain || isGeminiWallet ? (
                  <Trans>Smart wallets are not supported on Express or One-Click Trading.</Trans>
                ) : undefined
              }
              info={
                <Trans>
                  GMX executes transactions for you without individual signing, providing a seamless, CEX-like
                  experience. Trades use GMX-sponsored premium RPCs for reliability, even during network congestion. Gas
                  payments in {gasPaymentTokensText}.
                </Trans>
              }
              chip={
                <Chip color="blue">
                  <Trans>Fastest</Trans>
                </Chip>
              }
              active={tradingMode === TradingMode.Express1CT}
              onClick={() => handleTradingModeChange(TradingMode.Express1CT)}
            />

            {isOutOfGasPaymentBalance && !(isNonEoaAccountOnAnyChain || isGeminiWallet) && (
              <ExpressTradingOutOfGasBanner onClose={onClose} />
            )}

            <OldSubaccountWithdraw />

            {Boolean(subaccountState.subaccount && getIsSubaccountActive(subaccountState.subaccount)) && (
              <OneClickAdvancedSettings />
            )}

            {settings.expressOrdersEnabled && (
              <GasPaymentTokenSelector
                currentTokenAddress={settings.gasPaymentTokenAddress}
                onSelectToken={handleSelectGasPaymentToken}
              />
            )}
          </SettingsSection>
        </>
      )}

      {srcChainId && !isAvalancheEmpty && isConnected && (
        <SettingsSection className="mt-2">
          <div className="flex items-center justify-between">
            <TooltipWithPortal
              className="font-medium"
              variant="icon"
              content={
                <Trans>
                  The settlement chain is the network used for your GMX Account and opening positions. GMX Account
                  balances and positions are specific to the selected network.
                </Trans>
              }
              handle={<Trans>Settlement Chain</Trans>}
            />
            <DropdownSelector
              slim
              variant="ghost"
              value={settlementChainId}
              onChange={setSettlementChainId}
              options={MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[srcChainId]}
              item={({ option }) => (
                <div className="flex items-center gap-8 text-typography-primary">
                  <img src={CHAIN_ID_TO_NETWORK_ICON[option]} alt={getChainName(option)} className="size-20" />
                  <span>{getChainName(option)}</span>
                </div>
              )}
              button={
                <div className="flex items-center gap-4 text-typography-primary">
                  <img
                    src={CHAIN_ID_TO_NETWORK_ICON[settlementChainId]}
                    alt={getChainName(settlementChainId)}
                    className="size-20"
                  />
                  <span>{getChainName(settlementChainId)}</span>
                </div>
              }
            />
          </div>
          <SettlementChainWarningContainer />
        </SettingsSection>
      )}

      <SettingsSection className="mt-2">
        <InputSetting
          title={<Trans>Default Allowed Slippage</Trans>}
          description={
            <div>
              <Trans>
                Slippage is the difference between your expected and actual execution price due to price volatility.
                Orders won't execute if slippage exceeds your allowed maximum.
                <br />
                <br />
                Note: slippage is different from price impact, which is based on open interest imbalances.
              </Trans>{" "}
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2#slippage">
                <Trans>Read more</Trans>
              </ExternalLink>
              .
            </div>
          }
          defaultValue={DEFAULT_SLIPPAGE_AMOUNT}
          value={parseFloat(String(settings.savedAllowedSlippage))}
          onChange={onChangeSlippage}
          suggestions={EMPTY_ARRAY}
        />

        <InputSetting
          title={<Trans>TWAP Number of Parts</Trans>}
          description={
            <div>
              <Trans>The default number of parts for Time-Weighted Average Price (TWAP) orders.</Trans>
            </div>
          }
          defaultValue={DEFAULT_TIME_WEIGHTED_NUMBER_OF_PARTS}
          value={numberOfParts}
          onChange={onChangeTwapNumberOfParts}
          onBlur={onBlurTwapNumberOfParts}
          type="number"
        />

        {settings.shouldUseExecutionFeeBuffer && (
          <InputSetting
            title={<Trans>Max Network Fee Buffer</Trans>}
            description={
              <div>
                <Trans>
                  The max network fee is set to a higher value to handle potential increases in gas price during order
                  execution. Any excess network fee will be refunded to your account when the order is executed. Only
                  applicable to GMX V2.
                </Trans>
                <br />
                <br />
                <ExternalLink href="https://docs.gmx.io/docs/trading/#network-fee-buffer">
                  <Trans>Read more</Trans>
                </ExternalLink>
              </div>
            }
            defaultValue={30}
            value={parseFloat(String(settings.executionFeeBufferBps))}
            onChange={onChangeExecutionFeeBufferBps}
            maxValue={1000 * 100}
            suggestions={EMPTY_ARRAY}
          />
        )}

        {chainId === ARBITRUM && (
          <div className="flex w-full items-center justify-between">
            <TooltipWithPortal
              className="font-medium"
              variant="icon"
              handle={<Trans>Send remaining collateral to</Trans>}
              content={
                <div>
                  <Trans>
                    <span className="font-bold">GMX Account</span> keeps funds in your GMX Account for faster trading
                    and lower gas costs.
                    <br />
                    <br />
                    <span className="font-bold">Arbitrum wallet</span> sends funds directly to your connected wallet.
                  </Trans>
                </div>
              }
            />
            <CollateralDestinationSelector
              isReceiveToGmxAccount={settings.receiveToGmxAccount ?? false}
              onChangeDestination={settings.setReceiveToGmxAccount}
              desktopPanelClassName="!z-[10000] w-[200px] !top-[10px]"
            />
          </div>
        )}

        <ToggleSwitch isChecked={settings.isAutoCancelTPSL} setIsChecked={settings.setIsAutoCancelTPSL}>
          <TooltipWithPortal
            content={
              <div>
                <Trans>
                  TP/SL orders will be automatically cancelled when the associated position is completely closed. This
                  will only affect newly created TP/SL orders since the setting was enabled.
                </Trans>
                <br />
                <br />
                <ExternalLink href="https://docs.gmx.io/docs/trading/#auto-cancel-tp--sl">
                  <Trans>Read more</Trans>
                </ExternalLink>
                .
              </div>
            }
            handle={<Trans>Auto-Cancel TP/SL</Trans>}
            variant="icon"
            className="font-medium"
          />
        </ToggleSwitch>

        {/* External swaps are enabled by default on Botanix */}
        {chainId !== BOTANIX && (
          <ToggleSwitch
            isChecked={settings.externalSwapsEnabled}
            setIsChecked={settings.setExternalSwapsEnabled}
            className="font-medium"
          >
            <Trans>Enable External Swaps</Trans>
          </ToggleSwitch>
        )}

        <ToggleSwitch
          isChecked={settings.isSetAcceptablePriceImpactEnabled}
          setIsChecked={settings.setIsSetAcceptablePriceImpactEnabled}
          className="font-medium"
        >
          <Trans>Set Acceptable Price Impact</Trans>
        </ToggleSwitch>
      </SettingsSection>
    </div>
  );
}
