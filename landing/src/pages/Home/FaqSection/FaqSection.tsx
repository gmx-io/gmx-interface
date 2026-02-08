import { t, Trans } from "@lingui/macro";

import { FaqItem } from "./FaqItem";

export function FaqSection() {
  return (
    <section className="flex w-full bg-slate-900 px-16 py-[120px] text-white sm:px-40">
      <div className="mx-auto flex w-[1200px] flex-col justify-between gap-36 overflow-hidden sm:flex-row sm:gap-[120px]">
        <h2 className="text-heading-2">
          <Trans>FAQ</Trans>
        </h2>
        <div className="flex w-full flex-col gap-12 sm:w-[800px]">
          <FaqItem title={t`What makes GMX one of the best places to earn yield on my crypto?`}>
            <Trans>
              <p>
                Liquidity providers receive 63% of all trading and liquidation fees. By depositing WBTC, ETH, USDC, or
                other supported assets, you can earn up to ~35% annualized yield on the largest pools.
              </p>
              <ul className="list-disc pl-14">
                <li> GM pools – choose single-market exposure for targeted returns</li>
                <li> GLV vaults – auto-diversify across markets for a hands-off strategy</li>
              </ul>
              <p>
                Historically, both options have outperformed standard LP benchmarks. See live stats on the Pools page.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`How do I get started on GMX?`}>
            <Trans>
              <p>No KYC, no lengthy onboarding, and no deposit required. All you need is a self-custody wallet:</p>
              <ul className="list-decimal pl-14">
                <li>
                  Connect any EVM wallet (such as MetaMask, Rabby, Coinbase Wallet, Trust Wallet, OKX Wallet, Ledger,
                  etc.)
                </li>
                <li>Select a supported blockchain network where you have funds available</li>
                <li>Start trading</li>
              </ul>
              <p>
                You can trade directly using funds on Arbitrum, Avalanche, Solana, or Botanix, or deposit to your GMX
                Account to trade from any supported Multichain network.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`What makes GMX more cost-efficient than other perpetual platforms?`}>
            <Trans>
              <p>
                GMX executes trades against a dynamically balanced liquidity pool, unlike traditional order books. This
                model supports deep liquidity, allowing for opening positions of over $50m with reduced price impact,
                even when compared to the biggest order books in the space. In some cases, you may even get paid when
                executing an order due to a positive price impact.
              </p>

              <p>
                GMX prevents unfair liquidations by using decentralized oracles from Chainlink and Chaos Labs, which
                aggregate prices from multiple trusted sources to avoid manipulation.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`Can I build on top of GMX or integrate it into my DeFi app?`}>
            <Trans>
              <p>
                Yes, we encourage you to build on top of GMX or integrate it into your DeFi app. GMX is fully composable
                and already integrated with hundreds of protocols across the ecosystem, including notable names like
                Pendle, Dolomite, Radiant, Silo Finance, Venus Protocol, Abracadabra, Compound, and Beefy. You can
                interact directly with GMX smart contracts or use available APIs and SDKs to plug into trading,
                liquidity, or data flows. Check out the{" "}
                <a href="https://docs.gmx.io/docs/category/api/" className="cursor-pointer text-blue-400">
                  GMX Developer Docs
                </a>{" "}
                to get started.
              </p>
            </Trans>
          </FaqItem>
        </div>
      </div>
    </section>
  );
}
