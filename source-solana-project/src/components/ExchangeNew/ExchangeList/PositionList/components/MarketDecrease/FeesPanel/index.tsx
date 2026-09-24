import { useEffect, useState } from "react";
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { USD_DECIMALS } from "@/config/constants";
import { GMX_SOLANA_TOKENS_RAW } from "@/config/program";
import { formatRatePercentage } from '@/utils/legacy/format'
import { useAppStore } from '@/zustand/useAppStore'
import { useShallow } from 'zustand/react/shallow';
import './index.scss'
import { t } from "@lingui/macro";
import { BN_ZERO } from "@solana/spl-governance";

export default function FeesPanel({
    type,
    reportData,
    swapData,
    position,
    amount,
    value,
    path,
    deltaSize,
    priceImpactValueBN,
    userOrderFeeVipDiscountFactor,
    userOrderFeeReferralDiscountFactor,
    marketInfo,
}: {
    reportData?: any[]
    swapData?: any[]
    position?: any
    amount?: BN
    value?: BN
    deltaSize?: BN
    path?: string[]
    type?: 'openInterest' | 'closeInterest'
    priceImpactValueBN?: BN
    userOrderFeeVipDiscountFactor?: BN
    userOrderFeeReferralDiscountFactor?: BN
    marketInfo?: any
}) {
    if (amount?.eq(new BN(0))) {
        return <span style={{ color: '#fff' }}>$0.00</span>
    }
    const { tokenPriceMap, tickers } = useAppStore(
        useShallow((state) => ({
            tickers: state.tickersState.tickers,
            tokenPriceMap: state.tickersState.tokenPriceMap,
        }))
    );
    const { setSwapFeeRate } = useAppStore(useShallow((state) => state.swap));
    const { setFees, setVipFeeValue, setReferralFeeValue } = useAppStore(useShallow((state) => state.TradeboxNew));
    const { marketsMap } = useAppStore(useShallow((state) => state.markets));
    const [FeesList, setFeesList] = useState([])
    const [Fees, setStateFees] = useState(new BN(0))
    useEffect(() => {
        (async () => {
            const allFees = await getSwapFees(amount || new BN(0), value || new BN(0), swapData, marketsMap, path, tokenPriceMap)
            const closeFeeValue = reportData?.fees?.order?.fee_value || new BN(0)
            if (closeFeeValue.gt(new BN(0))) {
                const closeFeeRate = priceImpactValueBN?.gt(new BN(0)) ? new BN(marketInfo?.oFFForPositive) : new BN(marketInfo?.oFFForNegative)
                const vipFeeValue = closeFeeValue?.mul(userOrderFeeVipDiscountFactor)?.div(new BN(10).pow(new BN(20)))
                const referralFeeValue = closeFeeValue?.mul(userOrderFeeReferralDiscountFactor)?.div(new BN(10).pow(new BN(20)))
                setVipFeeValue(vipFeeValue)
                setReferralFeeValue(referralFeeValue)
                allFees.push({
                    feeValue: closeFeeValue.neg(),
                    text: type === 'closeInterest' ? t`Close Fee:` : t`Open Fee:`,
                    rate: closeFeeRate.neg(),
                    rateText: t`(${formatRatePercentage(closeFeeRate.neg(), 3, { signed: true })} of position size)`,
                    wordStyle: closeFeeValue.gt(new BN(0)) ? 'text-red-500' : 'text-green-500'
                })
                if (referralFeeValue?.gt(new BN(0))) {
                    allFees.push({
                        feeValue: referralFeeValue,
                        text: t`Referral Discount:`,
                        wordStyle: 'text-green-500'
                    })
                }
                if (vipFeeValue?.gt(new BN(0))) {
                    allFees.push({
                        feeValue: vipFeeValue,
                        text: t`GT VIP Discount:`,
                        wordStyle: 'text-green-500'
                    })
                }
            }
            const pending_borrowing_fee_value = position ? new BN(position?.pending_borrowing_fee_value || 0) : new BN(0)
            const pending_funding_fee_value = position ? new BN(position?.pending_funding_fee_value || 0) : new BN(0)
            if (pending_borrowing_fee_value.gt(new BN(0))) {
                allFees.push({
                    feeValue: pending_borrowing_fee_value.neg(),
                    text: t`Borrowing Fee:`,
                    wordStyle: pending_borrowing_fee_value.neg().gt(new BN(0)) ? 'text-green-500' : 'text-red-500'
                })
            }
            if (pending_funding_fee_value.gt(new BN(0))) {
                allFees.push({
                    feeValue: pending_funding_fee_value.neg(),
                    text: t`Funding Fee:`,
                    wordStyle: pending_funding_fee_value.neg().gt(new BN(0)) ? 'text-green-500' : 'text-red-500'
                })
            }
            let Fees = new BN(0)
            if (!allFees) {
                return
            }
            allFees.map((item) => {
                Fees = Fees.add(item.feeValue)
            })
            setFeesList(allFees)
            setStateFees(Fees)
            setFees(Fees)
        })()
    }, [tickers])

    function getSwapFees(amount, value, swapData, MarketsMap, path, tokenPriceMap) {
        let swapPriceImpactValue = new BN(0)
        const swapFees = []
        let feesAllRate = new BN(0);
        if (!swapData?.length) {
            setSwapFeeRate('-0.000%');
            return []
        }
        for (let i = 0; i < swapData?.length; i++) {
            const swap = swapData[i]
            const is_token_in_long = swap?.params?.is_token_in_long
            const marketInfo = MarketsMap.get(path[i])
            let tokenInAddr = marketInfo?.longToken || ""
            let tokenOutAddr = marketInfo?.shortToken || ""
            if (!is_token_in_long) {
                tokenInAddr = tokenOutAddr
                tokenOutAddr = marketInfo?.longToken || ""
            }
            const tokenInSymbol = GMX_SOLANA_TOKENS_RAW[tokenInAddr].symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[tokenInAddr].symbol
            const tokenOutSymbol = GMX_SOLANA_TOKENS_RAW[tokenOutAddr].symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[tokenOutAddr].symbol
            const price_impact_value = swap?.result?.price_impact_value || new BN(0)
            swapPriceImpactValue = swapPriceImpactValue.add(price_impact_value)
            const fee_amount_for_pool = swap?.result?.token_in_fees?.fee_amount_for_pool || new BN(0)
            const fee_amount_for_receiver = swap?.result?.token_in_fees?.fee_amount_for_receiver || new BN(0)
            const feeAmount = fee_amount_for_pool.add(fee_amount_for_receiver)
            const tokenInUnitPrice = tokenPriceMap.get(tokenInAddr)?.unitPrice || 0
            const feeValue = feeAmount.mul(new BN(tokenInUnitPrice)).neg();
            const text = t`Swap ${tokenInSymbol} to ${tokenOutSymbol}:`
            let divAmount = amount
            if (swapData.length > 1 && i > 0) {
                divAmount = swapData[i - 1]?.result?.token_out_amount || amount
            }
            const rate = feeAmount.mul(new BN(10).pow(new BN(USD_DECIMALS))).div(divAmount)
            const rateText = t`(${formatRatePercentage(rate.neg(), 3, { signed: true })} of swap amount)`
            feesAllRate = feesAllRate.add(rate)
            swapFees.push({
                tokenInSymbol,
                tokenOutSymbol,
                feeValue,
                text,
                rate,
                rateText,
                wordStyle: feeValue.gt(new BN(0)) ? 'text-green-500' : 'text-red-500'
            })
        }
        const threshold = new BN(10).pow(new BN(16)); // 0.0001 = 10^16
        const decimals = feesAllRate.abs().lt(threshold) ? 4 : 3;
        const feeValueRateText = formatRatePercentage(feesAllRate.neg(), decimals, { signed: true })
        setSwapFeeRate(feeValueRateText);
        const rate = swapPriceImpactValue.mul(new BN(10).pow(new BN(USD_DECIMALS))).div(value)
        const rateText = t`(${formatRatePercentage(rate, 3, { signed: true })} of swap amount)`
        swapFees.unshift({
            feeValue: swapPriceImpactValue,
            text: t`Swap Price Impact:`,
            rate,
            rateText,
            wordStyle: swapPriceImpactValue.gt(new BN(0)) ? 'text-green-500' : 'text-red-500'
        })
        return swapFees
    }
    return (<>
        {
            Fees.eq(new BN(0)) ?
                <span style={{ color: '#fff' }}>$0.00</span> :
                <TooltipWithPortal
                    className="TradeFeesRow-tooltip text-red-500"
                    handle={
                        <span className={Fees.gt(new BN(0)) ? 'text-green-500' : 'text-red-500'}>{formatUsd(new BN(Fees)) || '-'}</span>
                    }
                    position="left-end"
                    renderContent={() => (
                        <div>
                            {
                                FeesList?.map((item: any) => {
                                    return (<>
                                        <p key={item.text} style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{item.text}</span>
                                            <span className={item.wordStyle}>

                                                {item.feeValue?.abs()?.gt(new BN(1).mul(new BN(10).pow(new BN(18)))) ?
                                                    <>{item.feeValue?.gt(BN_ZERO) ? '+$' + formatAmount(item.feeValue?.abs(), USD_DECIMALS, 2) : '-$' + formatAmount(item.feeValue?.abs(), USD_DECIMALS, 2)}</> : (item.feeValue?.gt(BN_ZERO) ? '< +$0.01' : '< -$0.01')}
                                            </span>
                                        </p>
                                        {item.rateText && <p style={{ color: '#A3A3A3' }}> {item.rateText} </p>}
                                    </>
                                    )
                                })
                            }
                        </div>
                    )
                    }
                />
        }
    </>);
}
