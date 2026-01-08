# GMX Interface Tooltip Optimization Guide

> **Generated:** January 2026
> **Total Tooltips:** ~200+ instances across 86 files
> **Purpose:** Comprehensive reference for optimizing tooltip messages

---

## Table of Contents

1. [Trading / Positions](#1-trading--positions)
2. [Earn / Pools (GM/GLV)](#2-earn--pools-gmglv)
3. [Settings](#3-settings)
4. [Claims / Referrals](#4-claims--referrals)
5. [Network / Account](#5-network--account)
6. [Leaderboard](#6-leaderboard)
7. [Charts / Market Data](#7-charts--market-data)
8. [Dashboard](#8-dashboard)
9. [Other Components](#9-other-components)

---

## Writing Guidelines

1. **Clarity**: Lead with what the value represents
2. **Action-focus**: Help users understand what to do
3. **Brevity**: Remove redundant words
4. **Consistency**: Match terminology across tooltips
5. **User-centric**: Avoid technical jargon

---

## 1. Trading / Positions

### 1.1 PositionItem.tsx - Net Value
**File:** `src/components/PositionItem/PositionItem.tsx:81-191`

**Current:**
> Net value is the amount held in the position inclusive of PnL, fees and net price impact.

**Suggested:**
> Your position's current worth if closed now. Includes profit/loss minus all fees.

---

### 1.2 PositionItem.tsx - Collateral Warning
**File:** `src/components/PositionItem/PositionItem.tsx:229-237`

**Current:**
> WARNING: This position has a low amount of collateral after deducting fees, deposit more collateral to reduce the position's liquidation risk.

**Suggested:**
> Low collateral warning: Add collateral to reduce liquidation risk.

---

### 1.3 PositionItem.tsx - Collateral Info
**File:** `src/components/PositionItem/PositionItem.tsx:298-304`

**Current:**
> Use the edit collateral icon to deposit or withdraw collateral.
> Negative funding fees are automatically settled against the collateral and impact the liquidation price. Positive funding fees can be claimed under the claims tab.

**Suggested:**
> Click the pencil icon to adjust collateral.
> Negative funding fees reduce your collateral. Positive fees are claimable in the Claims tab.

---

### 1.4 PositionItem.tsx - Liquidation Price (No Liq)
**File:** `src/components/PositionItem/PositionItem.tsx:342-351`

**Current:**
> Since your position's collateral is in {symbol}, with an initial value higher than the {indexName} short position size, the collateral value will increase to cover any negative PnL, so there is no liquidation price.

**Suggested:**
> No liquidation price. Your {symbol} collateral exceeds your position size and will cover any losses.

---

### 1.5 PositionItem.tsx - Liquidation Time Warning
**File:** `src/components/PositionItem/PositionItem.tsx:361-376`

**Current:**
> Liquidation price is influenced by fees and collateral value.
> This position could be liquidated, excluding any price movement, due to funding and borrowing fee rates reducing the position's collateral over time.

**Suggested:**
> Liquidation risk from fees: Even without price changes, accumulated fees will reduce your collateral.
> Add collateral to extend this timeframe.

---

### 1.6 PositionItem.tsx - Market Info
**File:** `src/components/PositionItem/PositionItem.tsx:453-473`

**Current:**
> Click on the position to select it, then use the trade box to increase it.
> Use the "Close" button to reduce your position via market, TP/SL, or TWAP orders.

**Suggested:**
> To increase: Click position, then use trade panel.
> To reduce/close: Click "Close" button.

---

### 1.7 AllowedSlippageRow.tsx - Slippage
**File:** `src/components/TradeBox/TradeBoxRows/AllowedSlippageRow.tsx:42-52`

**Current:**
> Slippage is the difference between your expected and actual execution price due to price volatility. Orders won't execute if slippage exceeds your allowed maximum. The default can be adjusted in settings.
> A low value (e.g. less than -0.30%) may cause failed orders during volatility.
> Note: slippage is different from price impact, which is based on open interest imbalances. Read more.

**Suggested:**
> Slippage: The price difference between order submission and execution.
> Too low (<0.30%): Orders may fail during volatility.
> Too high: You may get worse prices.
> Note: Different from price impact. Read more.

---

### 1.8 PriceImpactFeesRow.tsx - Net Price Impact (Trigger)
**File:** `src/components/TradeBox/TradeBoxRows/PriceImpactFeesRow.tsx:102-108`

**Current:**
> Net price impact is the price impact for your position. Read more.

**Suggested:**
> Net price impact: How your trade affects market price. Positive = better price for you. Read more.

---

### 1.9 PriceImpactFeesRow.tsx - No Price Impact (Increase)
**File:** `src/components/TradeBox/TradeBoxRows/PriceImpactFeesRow.tsx:169-175`

**Current:**
> There is no price impact for increase orders, orders are filled at the mark price. Read more.

**Suggested:**
> No price impact on increases. Orders execute at the current mark price. Read more.

---

### 1.10 PositionSellerPriceImpactFeesRow.tsx
**File:** `src/components/PositionSeller/rows/PositionSellerPriceImpactFeesRow.tsx:56-66`

**Current:**
> Net price impact is the price impact for your position. Read more.

**Suggested:**
> Net price impact: How closing affects market price. Positive values benefit you. Read more.

---

### 1.11 PositionSeller AllowedSlippageRow.tsx
**File:** `src/components/PositionSeller/rows/AllowedSlippageRow.tsx:23-46`

**Current:**
> Slippage is the difference between your expected and actual execution price due to price volatility. Orders won't execute if slippage exceeds your allowed maximum. The default can be adjusted in settings.
> A low value (e.g. less than -0.30%) may cause failed orders during volatility.
> Note: slippage is different from price impact, which is based on open interest imbalances. Read more.

**Suggested:**
> (Same as 1.7 - consolidate to shared component)

---

### 1.12 PositionSeller.tsx - Keep Leverage Warning
**File:** `src/components/PositionSeller/PositionSeller.tsx:768-776`

**Current:**
> Keep leverage is not available as Position exceeds max. allowed leverage. Read more.

**Suggested:**
> Cannot keep leverage: Position exceeds maximum allowed. Read more.

---

### 1.13 PositionEditorAdvancedRows.tsx - Initial Collateral
**File:** `src/components/PositionEditor/PositionEditorAdvancedRows.tsx:53-61`

**Current:**
> Initial collateral (collateral excluding borrow and funding fee).

**Suggested:**
> Initial collateral: Your deposit before any fees were deducted.

---

### 1.14 PositionSellerAdvancedDisplayRows.tsx
**File:** `src/components/PositionSeller/PositionSellerAdvancedDisplayRows.tsx:150-156`

**Current:**
> Initial collateral (collateral excluding borrow and funding fee).

**Suggested:**
> Initial collateral: Your deposit before any fees were deducted.

---

### 1.15 LimitAndTPSLRows.tsx - Stop Loss Max
**File:** `src/components/TradeBox/TradeBoxRows/LimitAndTPSLRows.tsx:73-75`

**Current:**
> Combined stop losses are at maximum (100%). Decrease existing values to add more orders.

**Suggested:**
> Cannot add more. Your stop losses already cover 100% of your position.

---

### 1.16 LimitAndTPSLRows.tsx - Take Profit Max
**File:** `src/components/TradeBox/TradeBoxRows/LimitAndTPSLRows.tsx:74-76`

**Current:**
> Combined take profits are at maximum (100%). Decrease existing values to add more orders.

**Suggested:**
> Cannot add more. Your take profits already cover 100% of your position.

---

### 1.17 NextStoredImpactRows.tsx
**File:** `src/components/TradeBox/TradeBoxRows/NextStoredImpactRows.tsx:29-40`

**Current:**
> The price impact is not applied until the decrease action. These are the current estimated values at increase. Read more.

**Suggested:**
> Price impact applies when you close. These are estimates based on current conditions. Read more.

---

### 1.18 AvailableLiquidityRow.tsx - Swap Liquidity Risk
**File:** `src/components/TradeBox/TradeBoxRows/AvailableLiquidityRow.tsx:32-34`

**Current (liquidity risk):**
> There may not be sufficient liquidity to execute your order when the min. receive is met.

**Current (no risk):**
> The order will be executed if there is sufficient liquidity and the execution price guarantees that you will receive the minimum receive amount.

**Suggested (liquidity risk):**
> Warning: May not execute due to low liquidity at your min. receive price.

**Suggested (no risk):**
> Order executes when liquidity and price conditions are met.

---

### 1.19 AvailableLiquidityRow.tsx - Position Liquidity Risk
**File:** `src/components/TradeBox/TradeBoxRows/AvailableLiquidityRow.tsx:38-40`

**Current (liquidity risk):**
> There may not be sufficient liquidity to execute your order when the price conditions are met.

**Current (no risk):**
> The order will only execute if the price conditions are met and there is sufficient liquidity.

**Suggested (liquidity risk):**
> Warning: May not execute due to low liquidity at your trigger price.

**Suggested (no risk):**
> Order executes when price and liquidity conditions are met.

---

### 1.20 ExitPriceRow.tsx
**File:** `src/components/ExitPriceRow/ExitPriceRow.tsx:35-40`

**Current:**
> Expected exit price for the order, including the current capped net price impact.

**Suggested:**
> Expected exit price including price impact.

---

### 1.21 OrderEditor.tsx - Max Leverage Warning
**File:** `src/components/OrderEditor/OrderEditor.tsx:640-648`

**Current:**
> Decrease the size to match the max. allowed leverage: Read more.
> Set Max Leverage

**Suggested:**
> Order exceeds max leverage. Click to auto-adjust to maximum allowed.

---

### 1.22 TradeHistory.tsx - Realized PnL
**File:** `src/components/TradeHistory/TradeHistory.tsx:187-192`

**Current:**
> Realized PnL after fees and net price impact.

**Suggested:**
> Realized profit/loss after all fees and price impact.

---

### 1.23 HighPriceImpactOrFeesWarningCard.tsx
**File:** `src/components/HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard.tsx:37-43`

**Current:**
> The potential net price impact that will apply when closing this position may be high compared to the amount of collateral you're using. Consider reducing leverage.

**Suggested:**
> Warning: High price impact relative to your collateral. Consider reducing leverage.

---

### 1.24 useCollateralInTooltipContent.tsx - Long Stable
**File:** `src/components/TradeBox/hooks/useCollateralInTooltipContent.tsx:33-34`

**Current:**
> You will be long {indexSymbol} only from your long position.

**Suggested:**
> Pure {indexSymbol} long. Your exposure is only from the position.

---

### 1.25 useCollateralInTooltipContent.tsx - Long Non-Stable
**File:** `src/components/TradeBox/hooks/useCollateralInTooltipContent.tsx:36-49`

**Current:**
> You will be long {indexSymbol} from your long position, as well as from your {collateralSymbol} collateral. The liquidation price is higher compared to using a stablecoin as collateral since the worth of the collateral will change with its price.

**Suggested:**
> Double {indexSymbol} exposure from position + collateral.
> Note: Higher liquidation price than stablecoin collateral.

---

### 1.26 useCollateralInTooltipContent.tsx - Short Stable
**File:** `src/components/TradeBox/hooks/useCollateralInTooltipContent.tsx:52-53`

**Current:**
> You will be short {indexSymbol} only from your short position.

**Suggested:**
> Pure {indexSymbol} short. Your exposure is only from the position.

---

### 1.27 useCollateralInTooltipContent.tsx - Short Non-Stable
**File:** `src/components/TradeBox/hooks/useCollateralInTooltipContent.tsx:61-67`

**Current:**
> You will be short {indexSymbol} from your short position, while being long {collateralSymbol} from your {collateralSymbol} collateral. This can be useful for delta-neutral strategies to earn funding fees.

**Suggested:**
> Mixed exposure: Short {indexSymbol}, Long {collateralSymbol} collateral.
> Tip: Good for delta-neutral strategies to earn funding.

---

## 2. Earn / Pools (GM/GLV)

### 2.1 PerformanceLabel.tsx
**File:** `src/components/GmList/PerformanceLabel.tsx:24-34`

**Current:**
> Annualized return of the pool or vault over the selected period, compared to a benchmark that follows Uniswap V2–style rebalancing of the backing tokens in the same GM pool or GLV vault.
> Annualized figures based on short periods may be distorted by short-term volatility.
> For detailed stats and comparisons, see the GMX V2 LP Dashboard.

**Suggested:**
> Projected yearly return vs. a Uniswap V2-style benchmark.
> Note: Short timeframes may not reflect long-term performance.
> View detailed stats on Dune.

---

### 2.2 FeeApyLabel.tsx
**File:** `src/components/GmList/FeeApyLabel.tsx:21-29`

**Current:**
> Estimated annualized fees generated by trading activity (open, close, borrow, liquidations, swaps) over the selected period. Does not include backing token price changes, trading PnL, or funding fees.
> For detailed stats and comparisons, see the GMX V2 LP Dashboard.

**Suggested:**
> Fee APY: Projected yearly return from trading fees only.
> Includes: Trading fees, borrow fees, liquidations, swaps.
> Excludes: Token price changes, PnL, funding fees.

---

### 2.3 GmTokensTotalBalanceInfo.tsx - Earned Fees
**File:** `src/components/GmList/GmTokensTotalBalanceInfo.tsx:99-104`

**Current:**
> The fees' USD value is calculated at the time they are earned and does not include incentives.

**Suggested:**
> Fee values calculated when earned. Excludes incentive rewards.

---

### 2.4 GmTokensTotalBalanceInfo.tsx - 365d Estimate
**File:** `src/components/GmList/GmTokensTotalBalanceInfo.tsx:174-176`

**Current:**
> The 365d estimate is based on the past {daysConsidered}d APY.

**Suggested:**
> Projection based on last {daysConsidered} days of performance.

---

### 2.5 GmList.tsx - Performance Graph
**File:** `src/components/GmList/GmList.tsx:207-214`

**Current:**
> Graph showing performance vs benchmark over the selected period.

**Suggested:**
> Performance vs. benchmark comparison.

---

### 2.6 GlvList.tsx - Performance Graph
**File:** `src/components/GmList/GlvList.tsx:117-124`

**Current:**
> Graph showing performance vs benchmark over the selected period.

**Suggested:**
> Performance vs. benchmark comparison.

---

### 2.7 AprInfo.tsx - APR Breakdown
**File:** `src/components/AprInfo/AprInfo.tsx:74-80`

**Current:**
> The Bonus APR will be airdropped as {airdropTokenTitle} tokens. Read more.

**Suggested:**
> Bonus APR paid as {airdropTokenTitle} airdrops. Read more.

---

### 2.8 GmFees.tsx - Fee Breakdown
**File:** `src/components/GmSwap/GmFees/GmFees.tsx:55-187`

**Current:**
> Price Impact: (X% of amount)
> Buy/Sell Fee: (X% of amount)
> UI Fee: (X% of amount)

**Suggested:**
> (Keep structure, improve labels if needed)

---

### 2.9 EarnYieldOverview.tsx - Botanix Staking
**File:** `src/components/Earn/Discovery/EarnYieldOverview.tsx:332-337`

**Current:**
> Staking GMX is currently not supported on Botanix. For access to these features, please visit the Arbitrum and Avalanche deployments.

**Suggested:**
> GMX staking unavailable on Botanix. Use Arbitrum or Avalanche.

---

### 2.10 EarnYieldOverview.tsx - Botanix GLV
**File:** `src/components/Earn/Discovery/EarnYieldOverview.tsx:351-358`

**Current:**
> Botanix currently has no GLV vault(s) active. You can provide liquidity by purchasing GM tokens.

**Suggested:**
> No GLV vaults on Botanix. Provide liquidity via GM tokens instead.

---

### 2.11 VestModal.tsx - Converted Tokens
**File:** `src/components/Earn/Portfolio/AssetsList/GmxAssetCard/VestModal.tsx:538-548`

**Current:**
> {formatGmxAmount(claimSum)} tokens have been converted to GMX from the {formatGmxAmount(vestedAmount)} esGMX deposited for vesting.

**Suggested:**
> {claimSum} GMX converted from {vestedAmount} esGMX vested.

---

## 3. Settings

### 3.1 TradingSettings.tsx - Settlement Chain
**File:** `src/components/SettingsModal/TradingSettings.tsx:183-187`

**Current:**
> The settlement chain is the network used for your GMX Account and opening positions. GMX Account balances and positions are specific to the selected network.

**Suggested:**
> Settlement chain: Where your positions and GMX Account balance are held.
> Note: Assets don't transfer between networks.

---

### 3.2 TradingSettings.tsx - Slippage
**File:** `src/components/SettingsModal/TradingSettings.tsx:223-233`

**Current:**
> Slippage is the difference between your expected and actual execution price due to price volatility. Orders won't execute if slippage exceeds your allowed maximum.
> Note: slippage is different from price impact, which is based on open interest imbalances. Read more.

**Suggested:**
> Slippage tolerance: Maximum acceptable price difference on execution.
> Too low = failed orders. Too high = worse prices.
> Different from price impact. Read more.

---

### 3.3 TradingSettings.tsx - TWAP Parts
**File:** `src/components/SettingsModal/TradingSettings.tsx:244-248`

**Current:**
> The default number of parts for Time-Weighted Average Price (TWAP) orders.

**Suggested:**
> Default parts for TWAP orders (splits large orders over time).

---

### 3.4 TradingSettings.tsx - Network Fee Buffer
**File:** `src/components/SettingsModal/TradingSettings.tsx:261-271`

**Current:**
> The max network fee is set to a higher value to handle potential increases in gas price during order execution. Any excess network fee will be refunded to your account when the order is executed. Only applicable to GMX V2.
> Read more.

**Suggested:**
> Why a buffer? Gas prices can spike during execution.
> Unused fees are refunded. GMX V2 only. Read more.

---

### 3.5 TradingSettings.tsx - Auto-Cancel TP/SL
**File:** `src/components/SettingsModal/TradingSettings.tsx:284-294`

**Current:**
> TP/SL orders will be automatically cancelled when the associated position is completely closed. This will only affect newly created TP/SL orders since the setting was enabled.
> Read more.

**Suggested:**
> Auto-cancels TP/SL when position closes.
> Only affects new orders created after enabling. Read more.

---

### 3.6 TradingSettings.tsx - Smart Wallet Warning
**File:** `src/components/SettingsModal/TradingSettings.tsx:117-119`

**Current:**
> Smart wallets are not supported on Express or One-Click Trading.

**Suggested:**
> Smart wallets not supported for Express/One-Click modes.

---

### 3.7 TradingSettings.tsx - Classic Mode
**File:** `src/components/SettingsModal/TradingSettings.tsx:94-98`

**Current:**
> You sign each transaction on-chain using your own RPC, typically provided by your wallet. Gas payments in {nativeTokenSymbol}.

**Suggested:**
> Standard on-chain signing via your wallet.
> Gas: {nativeTokenSymbol}

---

### 3.8 TradingSettings.tsx - Express Mode
**File:** `src/components/SettingsModal/TradingSettings.tsx:109-112`

**Current:**
> You sign each transaction off-chain. Trades use GMX-sponsored premium RPCs for reliability, even during network congestion. Gas payments in {gasPaymentTokensText}.

**Suggested:**
> Off-chain signing with premium RPC execution.
> Gas: {gasPaymentTokensText}

---

### 3.9 TradingSettings.tsx - One-Click Mode
**File:** `src/components/SettingsModal/TradingSettings.tsx:141-145`

**Current:**
> GMX executes transactions for you without individual signing, providing a seamless, CEX-like experience. Trades use GMX-sponsored premium RPCs for reliability, even during network congestion. Gas payments in {gasPaymentTokensText}.

**Suggested:**
> No signing required - GMX executes for you.
> CEX-like speed with premium RPC reliability.
> Gas: {gasPaymentTokensText}

---

### 3.10 DisplaySettings.tsx - Net Price Impact Breakdown
**File:** `src/components/SettingsModal/DisplaySettings.tsx:39-56`

**Current:**
> Technically, net price impact breaks down into stored price impact (for increase orders) and close price impact (for decrease orders). This setting shows both in the net value tooltip and close modal execution details, plus the stored price impact for increase orders.

**Suggested:**
> Shows price impact breakdown: stored (increase orders) and close (decrease orders).
> Displays in net value tooltip and close modal.

---

### 3.11 OneClickAdvancedSettings.tsx - Max Actions
**File:** `src/components/OneClickAdvancedSettings/OneClickAdvancedSettings.tsx:107-113`

**Current:**
> Maximum number of actions allowed before reauthorization is required.

**Suggested:**
> Max actions before you need to re-authorize.

---

### 3.12 OneClickAdvancedSettings.tsx - Max Days
**File:** `src/components/OneClickAdvancedSettings/OneClickAdvancedSettings.tsx:127-133`

**Current:**
> Maximum number of days before reauthorization is required.

**Suggested:**
> Max days before you need to re-authorize.

---

## 4. Claims / Referrals

### 4.1 TradeFeesRow.tsx - Price Impact Rebates
**File:** `src/components/TradeFeesRow/TradeFeesRow.tsx:496-501`

**Current:**
> Price impact rebates for closing trades are claimable under the claims tab. Read more.

**Suggested:**
> Rebate available! Claim in the Claims tab. Read more.

---

### 4.2 TradeFeesRow.tsx - Bonus Rebate
**File:** `src/components/TradeFeesRow/TradeFeesRow.tsx:477-486`

**Current:**
> The bonus rebate is an estimate and can be up to {X}% of the open fee. It will be airdropped as {incentivesTokenTitle} tokens on a pro-rata basis. Read more.

**Suggested:**
> Estimated bonus (up to {X}% of fee). Airdropped as {token}. Read more.

---

### 4.3 TradeFeesRow.tsx - Swap Routing
**File:** `src/components/TradeFeesRow/TradeFeesRow.tsx:512-514`

**Current:**
> This swap is routed through several GM pools for the lowest possible fees and price impact.

**Suggested:**
> Multi-pool routing for best fees and price impact.

---

### 4.4 AffiliatesStats.tsx - Traders Count
**File:** `src/components/Referrals/AffiliatesStats.tsx:175`

**Current:**
> Amount of traders you referred.

**Suggested:**
> Number of traders using your referral code.

---

### 4.5 AffiliatesStats.tsx - Volume
**File:** `src/components/Referrals/AffiliatesStats.tsx:203`

**Current:**
> Volume traded by your referred traders.

**Suggested:**
> Total trading volume from your referrals.

---

### 4.6 AffiliatesStats.tsx - Rebates Earned
**File:** `src/components/Referrals/AffiliatesStats.tsx:248`

**Current:**
> Rebates earned as an affiliate.

**Suggested:**
> Your affiliate earnings from referrals.

---

### 4.7 AffiliatesStats.tsx - Claimable
**File:** `src/components/Referrals/AffiliatesStats.tsx:297`

**Current:**
> Claimable rebates from your referred traders.

**Suggested:**
> Available to claim now.

---

### 4.8 AffiliatesStats.tsx - History
**File:** `src/components/Referrals/AffiliatesStats.tsx:465`

**Current:**
> Distribution history for claimed rebates and airdrops.

**Suggested:**
> History of claimed rewards and airdrops.

---

### 4.9 TradersStats.tsx - Discount
**File:** `src/components/Referrals/TradersStats.tsx:84-104`

**Current:**
> You will receive a {currentTierDiscount}% discount on opening and closing fees.

**Suggested:**
> Your discount: {currentTierDiscount}% off trading fees.

---

### 4.10 TradersStats.tsx - Volume
**File:** `src/components/Referrals/TradersStats.tsx:113`

**Current:**
> Volume traded by this account with an active referral code.

**Suggested:**
> Your trading volume with referral discount.

---

### 4.11 TradersStats.tsx - Rebates
**File:** `src/components/Referrals/TradersStats.tsx:158`

**Current:**
> Rebates earned by this account as a trader.

**Suggested:**
> Your fee savings from referral discounts.

---

### 4.12 TradersStats.tsx - V2 Auto Discount
**File:** `src/components/Referrals/TradersStats.tsx:219`

**Current:**
> GMX V2 discounts are automatically applied on each trade and are not displayed on this table.

**Suggested:**
> V2 discounts applied automatically (not shown here).

---

### 4.13 ReferralCodeWarnings.tsx - Not Registered
**File:** `src/components/Referrals/ReferralCodeWarnings.tsx:38-53`

**Current:**
> This code is not yet registered on {nonTakenNetworkNames}, you will not receive rebates there. Switch your network to create this code on {nonTakenNetworkNames}.

**Suggested:**
> Code not registered on {networks}. Switch networks to register.

---

### 4.14 ReferralCodeWarnings.tsx - Code Taken
**File:** `src/components/Referrals/ReferralCodeWarnings.tsx:58-71`

**Current:**
> This code has been taken by someone else on {takenNetworkNames}, you will not receive rebates from traders using this code on {takenNetworkNames}.

**Suggested:**
> Code taken on {networks}. You won't earn from those networks.

---

### 4.15 ClaimModal.tsx - Funding Fee
**File:** `src/components/ClaimModal/ClaimModal.tsx:374-384`

**Current:**
> Claimable Funding Fee.

**Suggested:**
> Claimable funding fees from your positions.

---

### 4.16 SettleAccruedFundingFeeModal.tsx
**File:** `src/components/SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal.tsx:240-245`

**Current:**
> Accrued Funding Fee.

**Suggested:**
> Accumulated funding fees to settle.

---

## 5. Network / Account

### 5.1 NetworkDropdown.tsx - Multichain Trading
**File:** `src/components/NetworkDropdown/NetworkDropdown.tsx:97-107`

**Current:**
> Trade on these networks using Arbitrum's liquidity via your GMX Account. On Arbitrum, you can also trade directly from your wallet.

**Suggested:**
> Trade via GMX Account using Arbitrum liquidity. On Arbitrum, wallet trading also available.

---

### 5.2 NetworkDropdown.tsx - Wallet Only
**File:** `src/components/NetworkDropdown/NetworkDropdown.tsx:122-127`

**Current:**
> On these networks, you can only trade directly from your wallet.

**Suggested:**
> Wallet trading only on these networks.

---

### 5.3 NetworkDropdown.tsx - Smart Wallet Warning
**File:** `src/components/NetworkDropdown/NetworkDropdown.tsx:162`

**Current:**
> This network doesn't support smart wallets.

**Suggested:**
> Smart wallets not supported on this network.

---

### 5.4 NetworkDropdown.tsx - Trade Options
**File:** `src/components/NetworkDropdown/NetworkDropdown.tsx:189-194`

**Current:**
> Trade directly from your wallet or via your GMX Account.

**Suggested:**
> Trade from wallet or GMX Account.

---

### 5.5 GmxAccountModal/MainView.tsx - GMX Account Balance
**File:** `src/components/GmxAccountModal/MainView.tsx:215-221`

**Current:**
> Your GMX Account balance, usable for trading from any supported chain.

**Suggested:**
> GMX Account balance. Trade from any supported chain.

---

### 5.6 NetworkFeeRow.tsx - Max Network Fee
**File:** `src/components/NetworkFeeRow/NetworkFeeRow.tsx:176-213`

**Current:**
> The max network fee is overestimated, including by the buffer set under settings. Upon execution, any excess network fee is sent back to your account. Read more.

**Suggested:**
> Max fee includes buffer for gas spikes. Unused fees refunded. Read more.

---

### 5.7 NetworkFeeRow.tsx - Network Fee Explanation
**File:** `src/components/NetworkFeeRow/NetworkFeeRow.tsx:229-240`

**Current:**
> The maximum network fee paid to the network. This fee is a blockchain cost not specific to GMX, and it does not impact your collateral.

**Suggested:**
> Blockchain network fee (not GMX-specific). Doesn't affect your collateral.

---

## 6. Leaderboard

### 6.1 LeaderboardAccountsTable.tsx - Ranking Criteria
**File:** `src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx:186-191`

**Current:**
> Only addresses with over {MIN_COLLATERAL_USD} in capital used are ranked.
> The capital used is calculated as the highest value of [sum of collateral of open positions - realized PnL + period start pending PnL].

**Suggested:**
> Minimum {MIN_COLLATERAL_USD} capital required for ranking.
> Capital = max(collateral - realized PnL + starting pending PnL).

---

### 6.2 LeaderboardAccountsTable.tsx - PnL
**File:** `src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx:204`

**Current:**
> The total realized and unrealized profit and loss for the period, including fees and price impact.

**Suggested:**
> Total PnL (realized + unrealized) after fees and price impact.

---

### 6.3 LeaderboardAccountsTable.tsx - PnL %
**File:** `src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx:211-217`

**Current:**
> The PnL ($) compared to the capital used.
> The capital used is calculated as the highest value of [sum of collateral of open positions - realized PnL + period start pending PnL].

**Suggested:**
> PnL relative to capital used (return on capital).

---

### 6.4 LeaderboardAccountsTable.tsx - Avg Size
**File:** `src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx:226`

**Current:**
> Average position size.

**Suggested:**
> Average position size across all trades.

---

### 6.5 LeaderboardAccountsTable.tsx - Avg Leverage
**File:** `src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx:233`

**Current:**
> Average leverage used.

**Suggested:**
> Average leverage across all positions.

---

### 6.6 LeaderboardAccountsTable.tsx - Win/Loss
**File:** `src/pages/LeaderboardPage/components/LeaderboardAccountsTable.tsx:240`

**Current:**
> Wins and losses for fully closed positions.

**Suggested:**
> Win/loss record for closed positions only.

---

### 6.7 LeaderboardPositionsTable.tsx - No Liquidation
**File:** `src/pages/LeaderboardPage/components/LeaderboardPositionsTable.tsx:313-315`

**Current:**
> There is no liquidation price, as the position's collateral value will increase to cover any negative PnL.

**Suggested:**
> No liquidation price. Collateral covers any losses.

---

### 6.8 GeneralPerformanceDetails.tsx - PnL
**File:** `src/pages/AccountDashboard/GeneralPerformanceDetails.tsx:48-54`

**Current:**
> The total realized and unrealized profit and loss for the period, including fees and price impact.

**Suggested:**
> Total PnL (realized + unrealized) after fees and price impact.

---

### 6.9 GeneralPerformanceDetails.tsx - PnL %
**File:** `src/pages/AccountDashboard/GeneralPerformanceDetails.tsx:57-71`

**Current:**
> The PnL ($) compared to the capital used.
> The capital used is calculated as the highest value of [sum of collateral of open positions - realized PnL + period start pending PnL].

**Suggested:**
> Return on capital used (PnL / capital).

---

## 7. Charts / Market Data

### 7.1 ChartHeader.tsx - Net Rate
**File:** `src/components/TVChart/ChartHeader.tsx:126-139`

**Current:**
> Net Rate / 1h (with detailed breakdown)

**Suggested:**
> Hourly net rate (funding - borrow).

---

### 7.2 MarketsList.tsx - TVL Breakdown
**File:** `src/components/MarketsList/MarketsList.tsx:230-253`

**Current:**
> TVL breakdown by market showing pool values

**Suggested:**
> (Keep current structure - dynamic content)

---

### 7.3 MarketsList.tsx - Liquidity Breakdown
**File:** `src/components/MarketsList/MarketsList.tsx:256-279`

**Current:**
> Liquidity breakdown by market

**Suggested:**
> (Keep current structure - dynamic content)

---

## 8. Dashboard

### 8.1 StatsCard.tsx - Fees Breakdown
**File:** `src/pages/Dashboard/StatsCard.tsx:126-132`

**Current:**
> Fees breakdown by chain and version

**Suggested:**
> (Keep current structure - dynamic content)

---

### 8.2 StatsCard.tsx - Volume Breakdown
**File:** `src/pages/Dashboard/StatsCard.tsx:140-158`

**Current:**
> Volume breakdown by chain

**Suggested:**
> (Keep current structure - dynamic content)

---

### 8.3 StatsCard.tsx - Users Breakdown
**File:** `src/pages/Dashboard/StatsCard.tsx:166-186`

**Current:**
> Users breakdown by chain

**Suggested:**
> (Keep current structure - dynamic content)

---

## 9. Other Components

### 9.1 NpsModal.tsx - Telegram
**File:** `src/components/NpsModal/NpsModal.tsx:85-90`

**Current:**
> Leave your Telegram if you're okay with being contacted for a quick follow-up.

**Suggested:**
> Optional: Share Telegram for follow-up questions.

---

### 9.2 UserIncentiveDistribution.tsx - Empty History
**File:** `src/components/UserIncentiveDistribution/UserIncentiveDistribution.tsx:146-148`

**Current:**
> The distribution history for your incentives, airdrops, and prizes will be displayed here.

**Suggested:**
> Your incentives, airdrops, and prizes will appear here.

---

### 9.3 UserFeedbackModal.tsx - Telegram
**File:** `src/components/UserFeedbackModal/UserFeedbackModal.tsx:125-130`

**Current:**
> Leave your Telegram if you're okay with being contacted for a quick follow-up.

**Suggested:**
> Optional: Share Telegram for follow-up questions.

---

## Summary - Files to Modify

### High Priority (User-facing, frequently seen)
1. `src/components/PositionItem/PositionItem.tsx` - 6 tooltips
2. `src/components/TradeBox/TradeBoxRows/AllowedSlippageRow.tsx` - 1 tooltip
3. `src/components/TradeBox/hooks/useCollateralInTooltipContent.tsx` - 4 tooltips
4. `src/components/SettingsModal/TradingSettings.tsx` - 9 tooltips
5. `src/components/TradeFeesRow/TradeFeesRow.tsx` - 3 tooltips

### Medium Priority (Earn/Pools)
6. `src/components/GmList/PerformanceLabel.tsx` - 1 tooltip
7. `src/components/GmList/FeeApyLabel.tsx` - 1 tooltip
8. `src/components/GmList/GmTokensTotalBalanceInfo.tsx` - 2 tooltips
9. `src/components/AprInfo/AprInfo.tsx` - 1 tooltip

### Lower Priority (Less frequently seen)
10. `src/components/Referrals/*.tsx` - Multiple tooltips
11. `src/pages/LeaderboardPage/components/*.tsx` - Multiple tooltips
12. `src/components/NetworkDropdown/NetworkDropdown.tsx` - 4 tooltips

---

## Next Steps

1. Review suggested rewrites for technical accuracy
2. Ensure i18n compatibility (Trans/t components)
3. Implement changes file by file
4. Test tooltip display
