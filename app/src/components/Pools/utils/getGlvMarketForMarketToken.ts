
export const findGlvMarketForMarketToken = (glvs: any, marketToken?: string) => {
    if (!glvs || !marketToken) return null;
    for (const [glvToken, info] of Object.entries(glvs)) {
        const match = (info as any)?.markets?.find(
            (m: any) => m?.marketTokenAddress?.toBase58?.() === marketToken
        );
        if (match) {
            return { glvToken, glvInfo: info, market: match };
        }
    }
    return null;
}