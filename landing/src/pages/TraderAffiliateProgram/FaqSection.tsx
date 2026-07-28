import { t, Trans } from "@lingui/macro";
import { FaqItem } from "landing/pages/Home/FaqSection/FaqItem";

export function FaqSection() {
  return (
    <section className="flex w-full bg-slate-900 px-16 py-80 text-white sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col justify-between gap-36 overflow-hidden sm:flex-row">
        <h2 className="text-heading-2">
          <Trans>FAQ</Trans>
        </h2>
        <div className="flex w-full flex-col gap-12 sm:w-[796px]">
          <FaqItem
            title={t`Is this custodial? Do I send you my funds?`}
            defaultOpen
            iconClassName="size-12 text-slate-500"
          >
            <Trans>
              <p>
                No, You trade entirely from your own wallet on GMX. We never hold your assets — discounts and payouts
                settle on-chain to your address.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`What's the minimum volume to qualify?`} iconClassName="size-12 text-slate-500">
            <Trans>
              <p>
                There's no fixed cutoff — the desk sets your tier from your recent and expected monthly volume. Most
                traders qualify starting around $500k/month; reach out and we'll confirm your rate.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`How and when do I get paid or credited?`} iconClassName="size-12 text-slate-500">
            <Trans>
              <p>
                Trader discounts apply automatically to your account once your tier is confirmed. Affiliate rebates
                accrue in real time and can be claimed on-chain from your referral dashboard at any time.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`Do I need to pass KYC?`} iconClassName="size-12 text-slate-500">
            <Trans>
              <p>
                No. GMX is self-custodial and permissionless — you connect a wallet and trade, no identity verification
                required.
              </p>
            </Trans>
          </FaqItem>
          <FaqItem title={t`Can I be both a trader and an affiliate?`} iconClassName="size-12 text-slate-500">
            <Trans>
              <p>
                Yes — the two programs stack. You can trade on your discounted tier while also earning affiliate rebates
                from anyone you refer.
              </p>
            </Trans>
          </FaqItem>
        </div>
      </div>
    </section>
  );
}
