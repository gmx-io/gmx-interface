import { Glv } from '@gmsol-labs/gmsol-sdk'

export const getGlvSimulator = (graph,glvBase64,poolInfo,payInfo,gmPoolInfo,address,glvSinglePayAmountBN,glvSingleReceiveAmountBN) => {
    if (!graph) {
        return
    }
    const simulator = graph?.to_simulator();
    if (!simulator) {
        return
    }
    const glv = Glv.decode_from_base64_with_options(glvBase64);
    if (!glv) {
        return
    }
    const glvModel = glv.to_model(BigInt(poolInfo?.totalSupply?.toString()));
    const glvToken = glvModel?.glv_token_address();
    simulator.insert_glv(glvModel);
    let glvBuySingleDepositParams: any;
    if (payInfo?.type === 'longToken') {
        glvBuySingleDepositParams = {
        glv_token: glvToken,
        market_token: gmPoolInfo?.marketToken,
        receiver: address,
        long_pay_token: payInfo?.tokenAddress,
        long_pay_amount: BigInt(glvSinglePayAmountBN.toString()) || 0n,
        min_receive_amount: BigInt(glvSingleReceiveAmountBN.toString()) || 0n,
        skip_unwrap_native_on_receive: true,
        }
    } else if (payInfo?.type === 'shortToken') { 
        glvBuySingleDepositParams = {
        glv_token: glvToken,
        market_token: gmPoolInfo?.marketToken,
        receiver: address,
        short_pay_token: payInfo?.tokenAddress,
        short_pay_amount: BigInt(glvSinglePayAmountBN.toString()) || 0n,
        min_receive_amount: BigInt(glvSingleReceiveAmountBN.toString()) || 0n,
        skip_unwrap_native_on_receive: true,
        }
    } else {
        glvBuySingleDepositParams = {
        glv_token: glvToken,
        market_token: gmPoolInfo?.tokenAddress,
        receiver: address,
        min_receive_amount: BigInt(glvSingleReceiveAmountBN.toString()) || 0n,
        skip_unwrap_native_on_receive: true,
        }
    }
    console.log('glvBuySingleDepositParams', glvBuySingleDepositParams);
    if (!glvBuySingleDepositParams) {
        return;
    }
    setGlvBuySingleDepositParams(glvBuySingleDepositParams)
    const depositSimulationOutput = simulator.simulate_deposit({
        params: glvBuySingleDepositParams,
    })
    console.log('depositSimulationOutput', depositSimulationOutput);
    const reportBuf = Buffer.from(depositSimulationOutput?.report(), 'base64');
    const res = decodeDepositReport(reportBuf);
    const priceImpact = res?.price_impact;
    const longPrice = tokenPriceMap[poolInfo?.longToken]?.unitPrice;
    const shortPrice = tokenPriceMap[poolInfo?.shortToken]?.unitPrice;
    const longFees = (res?.fees[0]?.fee_amount_for_pool?.add(res?.fees[0]?.fee_amount_for_receiver))?.mul(new BN(longPrice));
    const shortFees = (res?.fees[1]?.fee_amount_for_pool?.add(res?.fees[1]?.fee_amount_for_receiver))?.mul(new BN(shortPrice));
    const allFees = longFees?.add(shortFees);
    const _feesRate = glvSingleTradeMoney?.gt(new BN(0)) ? allFees?.mul(new BN(10000)).div(glvSingleTradeMoney) : new BN(0);
    const feesRate = _feesRate ? formatPercentage(Number(_feesRate), 2) : '0.00%';
    const _priceImpactRate = glvSingleTradeMoney?.gt(new BN(0)) ? priceImpact?.mul(new BN(10000))?.div(glvSingleTradeMoney) : new BN(0);
    const priceImpactRate = _priceImpactRate ? formatPercentage(Number(_priceImpactRate), 2) : '0.00%';
    return {
        allFees,
        feesRate,
        priceImpact,
        priceImpactRate,
        _priceImpactRate,
    }
}