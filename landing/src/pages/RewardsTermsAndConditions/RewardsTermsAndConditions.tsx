import { t } from "@lingui/macro";

import { getPageTitle } from "lib/legacy";

import SEO from "components/Seo/SEO";

export default function RewardsTermsAndConditions() {
  return (
    <SEO title={getPageTitle(t`Terms and Conditions`)}>
      <main className="bg-slate-800 p-16 sm:p-40" lang="en">
        <article className="mx-auto max-w-[1200px]">
          <header className="text-center">
            <h1 className="text-heading-4 my-24">GMX REWARDS AND STAKING PROGRAM TERMS</h1>
            <p className="text-14">Last Updated: 16 September 2026</p>
          </header>
          <div className="mt-74 space-y-74">
            <div>
              <p className="text-terms-body mb-24">
                These GMX Rewards and Staking Program Terms (“Terms”) govern participation in the GMX rewards, staking,
                multiplier, referral and related incentive program (the “Rewards Program”).
              </p>
              <p className="text-terms-body mb-24">
                By participating in the Rewards Program, staking GMX or esGMX for purposes of the Rewards Program,
                generating or claiming rewards, using a Rewards Multiplier, participating in a referral arrangement, or
                otherwise interacting with the Rewards Program, you acknowledge that you have read, understood and
                agreed to these Terms.
              </p>
              <p className="text-terms-body mb-24">
                These Terms supplement any other terms applicable to your use of GMX, the GMX protocol, relevant
                interfaces, smart contracts, tokens or related services.
              </p>
            </div>
            <section>
              <h2 className="text-terms-heading mb-24">NATURE OF THE REWARDS PROGRAM</h2>
              <p className="text-terms-body mb-24">
                The Rewards Program is an incentive program under which eligible users may receive esGMX, conditional
                allocations relating to GT, or other rewards based upon eligible activity and the applicable Rewards
                Multiplier.
              </p>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program does not create any entitlement to a fixed rate of return,
                interest, yield, profit or other financial return. Staking GMX or esGMX under the Rewards Program may
                contribute towards a user’s Rewards Multiplier, but staking alone does not constitute a promise or
                guarantee that a user will receive rewards.
              </p>
              <p className="text-terms-body mb-24">
                Rewards are dependent upon eligible activity, applicable fees, the user’s Rewards Multiplier, the
                applicable epoch, available pricing information, the continued operation of the Rewards Program and the
                other conditions described in these Terms and the Rewards interface.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ELIGIBILITY</h2>
              <p className="text-terms-body mb-24">
                A user may participate in the Rewards Program only where such participation is lawful for that user.
                Each user is responsible for determining whether participation in the Rewards Program, holding or
                staking GMX or esGMX, receiving esGMX, receiving or becoming entitled to GT, or otherwise interacting
                with the Rewards Program is permitted under the laws applicable to that user.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Program may be restricted or unavailable in certain jurisdictions or to certain persons.
                Access or eligibility may be restricted, suspended or terminated where reasonably necessary for legal,
                regulatory, sanctions, compliance, security, technical or anti-abuse purposes.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REWARD EPOCHS</h2>
              <p className="text-terms-body mb-24">
                Rewards are calculated using weekly epochs. Unless otherwise stated through the Rewards interface, each
                epoch begins Wednesday at 00:00 UTC and ends the following Wednesday at 00:00 UTC.
              </p>
              <p className="text-terms-body mb-24">
                Rewards displayed during an active epoch are provisional estimates only. No displayed reward becomes
                final merely because it appears within an interface, wallet, dashboard, API or other data source.
                Following completion of an epoch, calculations may be reviewed, verified, corrected and finalized before
                rewards become claimable.
              </p>
              <p className="text-terms-body mb-24">
                A reward shall only be considered finalized when the applicable distribution has been finalized by the
                Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ELIGIBLE POSITION FEES</h2>
              <p className="text-terms-body mb-24">
                Rewards are calculated by reference to the net eligible position fee generated by an eligible trade. The
                net eligible position fee means the applicable position fee after deduction of any referral discount and
                affiliate reward associated with that trade.
              </p>
              <p className="text-terms-body mb-24">
                Unless expressly stated otherwise, borrowing fees, funding fees, swap fees and separately identified
                liquidation fees are not included when calculating rewards. Position increases and position decreases
                may generate rewards where they otherwise satisfy the requirements of the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">A transaction will not generate rewards where:</p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>it occurs on a network on which the Rewards Program is not active;</li>
                <li>the Rewards Program is inactive;</li>
                <li>the applicable net eligible position fee is zero;</li>
                <li>the user has no applicable Rewards Multiplier;</li>
                <li>required pricing information is unavailable or cannot reasonably be verified;</li>
                <li>the transaction has been excluded under these Terms; or</li>
                <li>the transaction does not otherwise satisfy the applicable Rewards Program requirements.</li>
              </ul>
              <p className="text-terms-body mb-24">
                The Rewards Program is presently intended to apply to eligible trading activity on Arbitrum unless
                otherwise stated.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REWARD CALCULATION</h2>
              <p className="text-terms-body mb-24">
                For each 1× of active Rewards Multiplier, the target reward value is equal to 10% of the applicable net
                eligible position fee. Subject to these Terms, the calculated reward is allocated as 100% of the
                calculated reward value in esGMX together with an additional amount of GT corresponding to 20% of the
                calculated reward value. The esGMX and GT components are additive.
              </p>
              <p className="text-terms-body mb-24">
                Accordingly, at the maximum 10× Rewards Multiplier, the combined target reward value may be equivalent,
                at the applicable calculation prices, to up to 120% of the relevant net eligible position fee.
              </p>
              <p className="text-terms-body mb-24">
                References to USD or another fiat currency are calculation references only. They do not constitute a
                promise that any token, allocation or reward can be sold, transferred, redeemed or converted for that
                amount. Token quantities may be calculated using applicable GMX, GT or other pricing information
                selected for purposes of the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REWARDS MULTIPLIER</h2>
              <p className="text-terms-body mb-24">
                There is no automatic or default Rewards Multiplier. A user with a 0× Rewards Multiplier will ordinarily
                not generate rewards through an otherwise ordinary eligible trade.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Multiplier may be increased through qualifying activities including:
              </p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>weekly trading volume;</li>
                <li>staking GMX or esGMX;</li>
                <li>trading Featured Markets;</li>
                <li>qualifying Balancing Trades;</li>
                <li>lifetime trading volume; and</li>
                <li>an applicable Comeback or Return Bonus.</li>
              </ul>
              <p className="text-terms-body mb-24">
                Applicable multiplier components are cumulative, subject to a maximum aggregate Rewards Multiplier of
                10× unless otherwise stated by the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">VOLUME MULTIPLIER</h2>
              <p className="text-terms-body mb-24">
                Adjusted weekly trading volume may provide the following multiplier tiers:
              </p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>$1 million: +1×</li>
                <li>$10 million: +2×</li>
                <li>$100 million: +3×</li>
                <li>$500 million: +4×</li>
                <li>$1 billion: +5×</li>
              </ul>
              <p className="text-terms-body mb-24">
                Markets may be assigned coefficients that reduce the amount of trading volume counted towards a Volume
                Tier. Such coefficients affect progression towards the applicable Volume Tier and do not, unless
                expressly stated otherwise, reduce rewards generated from the eligible position fee itself.
              </p>
              <p className="text-terms-body mb-24">
                A Volume Tier achieved during an epoch remains active for the remainder of that epoch and the following
                four complete weekly epochs, after which it expires unless the applicable qualification requirements are
                satisfied again.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">STAKING AND STAKING MULTIPLIER</h2>
              <p className="text-terms-body mb-24">
                Users may stake GMX and esGMX to qualify for a Staking Multiplier. For purposes of determining the
                applicable Staking Tier, staked GMX and staked esGMX count equally.
              </p>
              <p className="text-terms-body mb-24">The current Staking Tiers are:</p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>10 GMX/esGMX: +1×</li>
                <li>100 GMX/esGMX: +2×</li>
                <li>1,000 GMX/esGMX: +3×</li>
                <li>10,000 GMX/esGMX: +4×</li>
                <li>50,000 GMX/esGMX: +5×</li>
              </ul>
              <p className="text-terms-body mb-24">
                Where a user increases the amount staked sufficiently to qualify for a higher Staking Tier during an
                active epoch, the increased Staking Multiplier takes effect from the beginning of the next epoch unless
                otherwise stated.
              </p>
              <p className="text-terms-body mb-24">
                Where a user unstakes sufficient GMX or esGMX to fall below the threshold for their existing Staking
                Tier, the reduction in the Staking Multiplier may take effect immediately.
              </p>
              <p className="text-terms-body mb-24">
                Subsequent transactions may therefore be calculated using the reduced multiplier.
              </p>
              <p className="text-terms-body mb-24">
                Staking does not guarantee rewards and does not create an entitlement to interest, yield or a fixed
                return. Users remain exposed to risks associated with GMX, esGMX, applicable smart contracts, blockchain
                networks and any relevant staking infrastructure.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">FEATURED MARKET BOOST</h2>
              <p className="text-terms-body mb-24">
                Selected markets may from time to time receive an additional +0.5× multiplier or another multiplier
                displayed through the Rewards interface. A Featured Market Boost applies only to eligible transactions
                in the applicable Featured Market during the period in which the boost is active.
              </p>
              <p className="text-terms-body mb-24">
                Featured Markets and applicable boosts may be introduced, changed or withdrawn from time to time.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">BALANCING TRADE BOOST</h2>
              <p className="text-terms-body mb-24">
                Certain transactions that contribute towards improving the balance of a relevant GMX liquidity pool may
                qualify for an additional +1× multiplier.
              </p>
              <p className="text-terms-body mb-24">Unless otherwise specified, a qualifying Balancing Trade must:</p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>constitute a position increase;</li>
                <li>increase the position by at least USD $1,000,000; and</li>
                <li>satisfy the applicable criteria for improving the balance of the relevant liquidity pool.</li>
              </ul>
              <p className="text-terms-body mb-24">
                The Balancing Trade Boost applies only to the qualifying transaction. Position decreases do not
                currently qualify for this boost.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">LIFETIME TRADING BOOST</h2>
              <p className="text-terms-body mb-24">
                A user who reaches USD $200 million in qualifying lifetime trading volume may qualify for a permanent
                +1× Rewards Multiplier, subject to these Terms and any applicable anti-abuse or eligibility
                requirements.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">COMEBACK OR RETURN BONUS</h2>
              <p className="text-terms-body mb-24">
                Certain previous GMX traders may qualify for a temporary +2× Return Bonus. Eligibility may require at
                least USD $10,000 in historical trading volume and no positive-size executed trade during the 60 days
                preceding launch of the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                The Return Bonus does not constitute an immediately claimable reward. It operates as an additional
                multiplier applicable to qualifying future activity.
              </p>
              <p className="text-terms-body mb-24">
                The additional rewards attributable to a Return Bonus are subject to the applicable allocation, which
                may range from USD $50 to USD $25,000 in calculated reward value.
              </p>
              <p className="text-terms-body mb-24">
                The +2× multiplier ceases to apply once the applicable Return Bonus allocation has been exhausted.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REFERRAL REWARDS</h2>
              <p className="text-terms-body mb-24">
                An eligible affiliate may receive rewards based upon rewards generated by users who validly apply that
                affiliate’s referral code. Subject to the applicable Rewards Program rules, the affiliate may receive an
                additional amount equivalent to 50% of the referred trader’s esGMX and GT reward amounts.
              </p>
              <p className="text-terms-body mb-24">
                The affiliate reward is additional to the referred trader’s reward and does not reduce the reward
                otherwise allocated to that trader. The additional referral reward applies only to qualifying new
                referrals made after commencement of the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                Wallets already referred, or which had an applicable referral code before commencement of the Rewards
                Program, do not qualify as new referrals for purposes of the additional referral reward. Self-referral,
                circular referral structures, coordinated wallet arrangements or other conduct designed principally to
                manufacture referral rewards may be excluded.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">esGMX</h2>
              <p className="text-terms-body mb-24">
                esGMX is a non-transferable reward token and should not be treated as cash or as an immediately
                transferable GMX token.
              </p>
              <p className="text-terms-body mb-24">
                Subject to applicable protocol rules, esGMX may be capable of being staked, counted towards an
                applicable Staking Tier, vested into GMX where eligible, added to an existing vest, and used to claim
                GMX as vesting occurs.
              </p>
              <p className="text-terms-body mb-24">
                Receipt of esGMX does not guarantee that the entire amount can immediately be vested into GMX. Vesting
                eligibility, available vesting amounts, collateral requirements and other conditions may depend upon the
                applicable account and relevant smart Contracts.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">VESTING</h2>
              <p className="text-terms-body mb-24">
                Eligible esGMX may gradually vest into GMX in accordance with the applicable vesting mechanics. The
                amount eligible for vesting and any required GMX collateral may differ between accounts, and there is no
                universal fixed collateral ratio applicable to every participant.
              </p>
              <p className="text-terms-body mb-24">
                The maximum amount capable of being vested may be limited by both the user’s available esGMX balance and
                the account’s remaining onchain vesting allowance.
              </p>
              <p className="text-terms-body mb-24">
                A user may, where supported, add eligible esGMX to an existing vest. Doing so may extend the expected
                completion date of the vest. Where an active vest is stopped, GMX already vested remains with the user,
                unvested esGMX may be returned, and applicable pair collateral may be released in accordance with the
                relevant smart contracts.
              </p>
              <p className="text-terms-body mb-24">Smart-contract operation ultimately governs onchain execution.</p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">GT ALLOCATIONS AND GT TERMS</h2>
              <p className="text-terms-body mb-24">
                GT has not completed its Token Generation Event as at the date of these Terms. Any reference within the
                Rewards Program to GT, a GT reward, GT balance, GT value or GT allocation represents a conditional
                program allocation only and must not be interpreted as representing presently liquid or transferable
                tokens.
              </p>
              <p className="text-terms-body mb-24">
                All GT allocations are expressly subject to any separate GT terms, token terms, Token Generation Event
                terms, sale terms, distribution terms, eligibility requirements, vesting provisions, transfer
                restrictions, claim procedures and other conditions applicable to GT from time to time (“GT Terms”).
              </p>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program does not, by itself, constitute a sale, purchase or issuance of GT.
                Any future sale, purchase, issuance, distribution, transfer or acquisition of GT shall be subject to the
                GT Terms applicable to that transaction.
              </p>
              <p className="text-terms-body mb-24">
                Where acceptance of separate GT Terms is required before GT can be sold, issued, purchased, claimed,
                received or transferred, the participant must accept those terms and satisfy the applicable requirements
                before becoming eligible to complete the relevant transaction.
              </p>
              <p className="text-terms-body mb-24">A displayed or calculated GT allocation does not constitute:</p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>legal or beneficial ownership of issued GT;</li>
                <li>a deposit or cash balance;</li>
                <li>a debt owed to the participant;</li>
                <li>a promise that GT will be issued on a particular date;</li>
                <li>a guarantee that a Token Generation Event will occur;</li>
                <li>a guarantee that GT will become transferable, tradeable or liquid;</li>
                <li>a promise of any particular market price or monetary value; or</li>
                <li>an unconditional obligation to issue, sell or distribute GT.</li>
              </ul>
              <p className="text-terms-body mb-24">
                Where there is any inconsistency between these Terms and the GT Terms in relation to the issuance, sale,
                purchase, distribution, transfer, vesting, claiming or use of GT, the applicable GT Terms shall prevail
                in relation to GT.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">PRICING</h2>
              <p className="text-terms-body mb-24">
                Where a reward calculation requires the use of a token price, exchange rate, oracle price, index, market
                price or other pricing information, the Rewards Program may use the applicable pricing source or
                methodology designated for that purpose.
              </p>
              <p className="text-terms-body mb-24">
                Displayed USD values are estimates or calculation references and are not guarantees of realizable value.
                Token prices may change materially between calculation, finalization, claiming, vesting, transfer and
                sale.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Program may correct a reward calculation where the underlying price information was
                unavailable, delayed, corrupted, manifestly erroneous or affected by manipulation or technical failure.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">PROVISIONAL REWARDS AND CORRECTIONS</h2>
              <p className="text-terms-body mb-24">
                Rewards displayed before finalization are provisional. The Rewards Program may correct calculation
                errors, duplicate allocations, pricing errors, software errors, indexing errors, oracle errors or other
                manifest mistakes.
              </p>
              <p className="text-terms-body mb-24">
                Where technically and legally possible, an erroneous allocation may be cancelled, corrected, adjusted or
                offset against future rewards. Nothing in these Terms requires the Rewards Program to distribute rewards
                generated as the result of an error, exploit, manipulation, unauthorized activity or conduct contrary to
                these Terms.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">PROHIBITED AND ABUSIVE ACTIVITY</h2>
              <p className="text-terms-body mb-24">
                Rewards may be withheld, excluded, cancelled or adjusted where activity is reasonably determined to
                involve manipulation or abuse of the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">Prohibited activity may include:</p>
              <ul className="text-terms-body mb-24 list-disc space-y-8 pl-24">
                <li>wash trading or artificial trading volume;</li>
                <li>self-dealing undertaken principally to generate rewards;</li>
                <li>Sybil activity;</li>
                <li>manipulation of markets, prices, fees or liquidity;</li>
                <li>manipulation or exploitation of referral arrangements;</li>
                <li>coordinated wallets used to circumvent eligibility requirements or program limits;</li>
                <li>exploitation of bugs, smart contracts, oracle behaviour or interface errors;</li>
                <li>
                  transactions structured principally to obtain rewards contrary to the intended operation of the
                  Rewards Program;
                </li>
                <li>sanctions evasion, fraud or unlawful conduct; and</li>
                <li>attempts to circumvent these Terms.</li>
              </ul>
              <p className="text-terms-body mb-24">
                Multiple wallets may, where reasonably appropriate for anti-abuse purposes, be treated as being under
                common control where sufficient evidence indicates that they are controlled by or acting for the same
                person or coordinated group.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">CLAIMING REWARDS</h2>
              <p className="text-terms-body mb-24">
                Rewards become claimable only after the applicable distribution has been finalized and the relevant
                claiming functionality has become available. esGMX distributions may be made available through the
                applicable GMX claiming interface. GT allocations remain additionally subject to the GT provisions of
                these Terms and the applicable GT Terms.
              </p>
              <p className="text-terms-body mb-24">
                Users are responsible for claiming rewards within any applicable claim period. Where a claim period or
                expiry date is specified, unclaimed rewards may expire after that period.
              </p>
              <p className="text-terms-body mb-24">
                Users are responsible for wallet transactions and applicable blockchain transaction or gas fees
                associated with claiming, staking, vesting or otherwise interacting with Rewards.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">WALLET AND BLOCKCHAIN RESPONSIBILITY</h2>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program requires interaction with blockchain technology and may require the
                use of a self-custodial wallet. Users are responsible for maintaining control and security of their
                wallets, private keys, seed phrases and authentication credentials.
              </p>
              <p className="text-terms-body mb-24">
                Blockchain transactions may be irreversible. To the maximum extent permitted by applicable law, the
                Rewards Program is not responsible for losses resulting from compromised private keys, compromised
                wallets, incorrect addresses, user error, phishing, malware, incompatible wallets or unauthorized
                transactions.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">BLOCKCHAIN AND SMART-CONTRACT RISKS</h2>
              <p className="text-terms-body mb-24">
                Blockchain protocols, smart contracts, bridges, oracles and decentralized applications involve
                technological and operational risks. These include smart-contract vulnerabilities, exploits, network
                congestion, blockchain reorganisations, forks, validator failures, oracle failures, governance changes,
                transaction failures and other events outside the reasonable control of the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                No representation or warranty is made that the Rewards Program, any smart contract, blockchain,
                interface or token will operate continuously, securely or without error.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO GUARANTEED RETURN</h2>
              <p className="text-terms-body mb-24">
                Nothing within the Rewards Program constitutes a guarantee of profit, investment return, APY, interest,
                yield or appreciation. Rewards are promotional and participation-based incentives determined under the
                applicable program rules.
              </p>
              <p className="text-terms-body mb-24">
                The amount or value of any reward may increase or decrease and may ultimately have little or no
                realizable value. Historical rewards, token prices, multiplier levels or trading activity are not
                guarantees of future rewards or value.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO INVESTMENT, FINANCIAL OR TAX ADVICE</h2>
              <p className="text-terms-body mb-24">
                Information concerning the Rewards Program is provided for informational purposes in connection with
                operation of the program. Nothing within the Rewards Program constitutes investment, financial, legal,
                tax or other professional advice, nor does it constitute a recommendation to acquire, dispose of, stake,
                trade or hold any token or other asset.
              </p>
              <p className="text-terms-body mb-24">
                Each user is responsible for obtaining independent advice appropriate to their Circumstances.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">TAX</h2>
              <p className="text-terms-body mb-24">
                Users are solely responsible for determining and satisfying any tax obligations arising from
                participation in the Rewards Program. This includes taxation associated with earning, receiving,
                claiming, staking, vesting, disposing of or otherwise dealing with rewards or tokens.
              </p>
              <p className="text-terms-body mb-24">
                No representation is made regarding the tax treatment of GMX, esGMX, GT or any reward in any
                jurisdiction.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">CHANGES TO THE REWARDS PROGRAM</h2>
              <p className="text-terms-body mb-24">
                The Rewards Program may be modified where reasonably considered necessary or appropriate. Changes may
                include modifications to reward rates, multiplier tiers, staking thresholds, eligible markets, market
                coefficients, Featured Market or Balancing Trade boosts, referral rewards, caps, eligibility
                requirements, pricing methodology, token allocations, vesting or claiming procedures, epoch structure,
                supported networks or other program mechanics.
              </p>
              <p className="text-terms-body mb-24">
                Changes may apply prospectively from a specified time or epoch. Where reasonably necessary because of
                security concerns, exploitation, technical failure, legal or regulatory requirements or circumstances
                requiring immediate action, changes may take effect immediately.
              </p>
              <p className="text-terms-body mb-24">
                Continued participation in the Rewards Program following the effective date of an applicable change
                constitutes acceptance of the Rewards Program as modified, subject to applicable law.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SUSPENSION OR TERMINATION</h2>
              <p className="text-terms-body mb-24">
                The Rewards Program may be suspended, reduced or terminated, in whole or in part, including where
                necessary because of program sustainability, trading activity, security concerns, technical conditions,
                legal or regulatory requirements or circumstances outside reasonable control.
              </p>
              <p className="text-terms-body mb-24">
                Termination of the Rewards Program does not create an entitlement to rewards that had not been finalized
                before termination. Finalized rewards remain subject to applicable claiming requirements, token terms,
                vesting conditions and these Terms.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO REPRESENTATION AS TO TOKEN VALUE</h2>
              <p className="text-terms-body mb-24">
                No representation or warranty is made concerning the present or future value, marketability, liquidity
                or utility of GMX, esGMX or GT.
              </p>
              <p className="text-terms-body mb-24">
                A reward calculation expressed by reference to USD or another currency does not create an obligation to
                provide that amount in fiat currency. Users accept the risk of fluctuations in token value.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">LIMITATION OF LIABILITY</h2>
              <p className="text-terms-body mb-24">
                To the maximum extent permitted by applicable law, the Rewards Program and persons involved in its
                operation shall not be liable for indirect, incidental, special, punitive or consequential losses, loss
                of profit, loss of opportunity, loss of anticipated rewards, loss arising from token-price movements, or
                loss resulting from blockchain, smart-contract, wallet, oracle or network failures.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms excludes or limits liability for fraud, fraudulent misrepresentation, death or
                personal injury caused by negligence, or any other liability to the extent that such liability cannot
                lawfully be excluded or limited under the laws of England and Wales.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">INDEMNITY</h2>
              <p className="text-terms-body mb-24">
                To the extent permitted by applicable law, a participant shall be responsible for losses, liabilities,
                claims, damages and reasonable costs arising directly from that participant’s fraud, unlawful conduct,
                material breach of these Terms, or deliberate exploitation or manipulation of the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">GOVERNING LAW</h2>
              <p className="text-terms-body mb-24">
                These Terms, the Rewards Program, and any contractual or non-contractual obligations arising out of or
                in connection with them shall be governed by and construed in accordance with the laws of England and
                Wales.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ARBITRATION AND DISPUTE RESOLUTION</h2>
              <p className="text-terms-body mb-24">
                Any dispute, controversy or claim arising out of or in connection with these Terms, the Rewards Program,
                any reward, staking activity, multiplier, referral reward, esGMX allocation, GT allocation, or any
                contractual or non-contractual obligation connected with the foregoing, including any dispute concerning
                the existence, validity, interpretation, performance, breach or termination of these Terms, shall be
                finally resolved by arbitration administered by the London International Arbitration Court (“LIACourt”).
              </p>
              <p className="text-terms-body mb-24">
                The arbitration shall be conducted in accordance with the arbitration rules of LIACourt in force at the
                time the arbitration is commenced, which rules are deemed incorporated into these Terms.
              </p>
              <p className="text-terms-body mb-24">
                The seat and legal place of arbitration shall be London, England. The tribunal shall consist of one
                arbitrator unless the applicable arbitration rules require otherwise or the parties subsequently agree
                otherwise in writing. The language of the arbitration shall be English.
              </p>
              <p className="text-terms-body mb-24">
                The substantive law governing the dispute shall be the laws of England and Wales. The arbitration
                agreement contained in these Terms shall itself be governed by the laws of England and Wales.
              </p>
              <p className="text-terms-body mb-24">
                The arbitration and all materials, evidence, submissions, orders and awards produced in connection with
                it shall, to the extent permitted by applicable law and the applicable arbitration rules, be treated as
                confidential.
              </p>
              <p className="text-terms-body mb-24">
                Any arbitral award shall be final and binding upon the parties and may be recognised and enforced by any
                court of competent jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms prevents a party from seeking urgent interim, conservatory or injunctive relief
                from a court of competent jurisdiction where such relief is permitted notwithstanding the agreement to
                arbitrate.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">INDIVIDUAL CLAIMS</h2>
              <p className="text-terms-body mb-24">
                To the maximum extent permitted by applicable law, disputes shall be brought by a participant in their
                individual capacity and not as a claimant or member of any purported class, collective, consolidated or
                representative proceeding.
              </p>
              <p className="text-terms-body mb-24">
                Where any restriction in this provision is determined to be unenforceable, it shall be severed only to
                the minimum extent necessary without affecting the remainder of the arbitration agreement.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SEVERABILITY</h2>
              <p className="text-terms-body mb-24">
                If any provision of these Terms is held to be invalid, illegal or unenforceable, that provision shall be
                interpreted or modified to the minimum extent necessary to make it enforceable where legally
                permissible.
              </p>
              <p className="text-terms-body mb-24">
                If modification is not possible, the affected provision shall be severed and the remaining provisions
                shall continue in full force and effect.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO WAIVER</h2>
              <p className="text-terms-body mb-24">
                A failure or delay in exercising any right under these Terms does not constitute a waiver of that right.
                A waiver in respect of one matter does not constitute a waiver in respect of any subsequent matter.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ENTIRE REWARDS PROGRAM TERMS</h2>
              <p className="text-terms-body mb-24">
                These Terms, together with any program-specific terms expressly incorporated into them and, in relation
                to GT, the applicable GT Terms, constitute the terms governing participation in the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                Descriptions, estimates, illustrations, calculators, dashboards and interface information are provided
                to explain operation of the Rewards Program and do not override these Terms. Where an interface contains
                a manifest error or conflicts with a finalized calculation made in accordance with these Terms, the
                finalized calculation shall prevail.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ACCEPTANCE OF TERMS</h2>
              <p className="text-terms-body mb-24">
                By connecting a wallet to participate in the Rewards Program, staking GMX or esGMX for purposes of the
                Rewards Program, undertaking an eligible transaction for which rewards are sought, claiming or
                attempting to claim a reward, accepting a GT allocation, participating in a referral arrangement, or
                otherwise electing to participate in the Rewards Program, the participant confirms that they have read,
                understood and agreed to be bound by these Terms.
              </p>
              <p className="text-terms-body mb-24">
                Where the applicable interface provides a mechanism requiring a participant to expressly accept these
                Terms, including by selecting an acceptance box, signing a wallet message, clicking or selecting an
                acceptance button, or providing another electronic confirmation, the participant’s completion of that
                action constitutes express acceptance of these Terms.
              </p>
              <p className="text-terms-body mb-24">
                Acceptance is effective from the earlier of the participant expressly accepting these Terms or first
                participating in the Rewards Program after these Terms have been presented or made reasonably available
                to that participant.
              </p>
              <p className="text-terms-body mb-24">
                A participant who does not agree to these Terms must not participate in the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                The participant acknowledges that acceptance of these Terms may be recorded electronically and that
                electronic records, wallet signatures, transaction records and other technically generated records may
                be used to demonstrate acceptance and Participation.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">IMPORTANT TRADING AND REWARDS RISK DISCLOSURE</h2>
              <p className="text-terms-body mb-24">
                Trading solely or principally for the purpose of obtaining rewards may result in trading losses, fees
                and other costs that exceed the value of any rewards earned or received. A higher Rewards Multiplier
                does not reduce the financial risk associated with trading and should not be understood as making any
                transaction profitable or economically advantageous.
              </p>
              <p className="text-terms-body mb-24">
                Participants should independently consider the risks and costs of any underlying trading or staking
                activity and should not undertake transactions solely for the purpose of reaching a Volume Tier, Staking
                Tier, multiplier threshold, reward level or other Rewards Program qualification. Rewards do not offset,
                insure against, reimburse or otherwise limit trading losses, liquidation losses, funding costs,
                borrowing costs, transaction costs or other losses.
              </p>
              <p className="text-terms-body mb-24">
                Historical reward amounts, trading volumes, multiplier levels, token prices, reward calculations and
                other historical information do not guarantee or indicate future rewards, token values or economic
                outcomes.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO CUSTODIAL, FIDUCIARY OR ADVISORY RELATIONSHIP</h2>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program does not create any custodial, trustee, fiduciary, agency,
                partnership, joint venture, investment management, brokerage, advisory or similar relationship between a
                participant and GMX, the GMX DAO, any member or participant of the GMX DAO, or any developer,
                contributor, consultant, contractor, service provider or other person involved with GMX or the Rewards
                Program.
              </p>
              <p className="text-terms-body mb-24">
                No reward, allocation, multiplier, staking position or other aspect of the Rewards Program constitutes
                client money, a bank account, deposit account, custodial account or managed investment account.
                Participants remain responsible for their own wallets, assets, transactions and decisions.
              </p>
              <p className="text-terms-body mb-24">
                No person assumes a fiduciary or similar duty to a participant merely because that person develops,
                contributes to, maintains, administers, supports, promotes or otherwise participates in GMX, the GMX
                DAO, the GMX protocol or the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO OWNERSHIP, EQUITY OR PROFIT-SHARING RIGHTS</h2>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program does not itself grant a participant any equity, ownership,
                membership, partnership, profit-sharing, revenue-sharing or similar interest in GMX, the GMX DAO, any
                treasury, protocol, entity, contributor or other person.
              </p>
              <p className="text-terms-body mb-24">
                A reward, Rewards Multiplier or conditional token allocation does not provide any right to the assets,
                revenues or profits of any such person or arrangement except for rights, if any, expressly attaching to
                a particular token following its valid issuance and acquisition.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO DEPOSIT, DEBT OR SEGREGATED FUNDS</h2>
              <p className="text-terms-body mb-24">
                A displayed, estimated, provisional or conditional reward does not constitute money held for a
                participant, client money, a deposit, an account balance, a loan, a debt presently due or funds held on
                trust.
              </p>
              <p className="text-terms-body mb-24">
                Unless and until a reward becomes final and claimable in accordance with these Terms, no asset is
                required to be segregated, reserved or held for a participant merely because a reward or allocation
                appears within an interface.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in the Rewards Program creates a debtor-creditor relationship merely as a consequence of an
                estimated, provisional or conditional reward being displayed.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REGULATORY STATUS AND REGULATORY CHANGE</h2>
              <p className="text-terms-body mb-24">
                No representation or warranty is made concerning the regulatory, legal, securities, commodities,
                derivatives, financial-services, tax or other classification of GMX, esGMX, GT, the Rewards Program or
                any related activity in any jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in the Rewards Program or these Terms constitutes a representation that GMX, esGMX, GT or any
                other digital asset is or is not a security, financial instrument, commodity, derivative, virtual asset
                or other regulated product under the laws of any jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                Laws, regulations, regulatory interpretations, enforcement positions and governmental policies
                concerning blockchain technology, digital assets, decentralized finance, derivatives, staking and token
                incentive programs may change. Such developments may require the Rewards Program or any related feature
                to be restricted, altered, suspended or terminated, including in relation to particular users,
                transactions or jurisdictions.
              </p>
              <p className="text-terms-body mb-24">
                No issuance, sale, distribution, transfer or other availability of any token is intended in any
                jurisdiction or to any person where doing so would be unlawful.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">USER REPRESENTATIONS</h2>
              <p className="text-terms-body mb-24">
                By participating in the Rewards Program, each participant represents that they have the legal capacity
                and authority necessary to accept the applicable Terms and to control or authorize the wallet through
                which they participate.
              </p>
              <p className="text-terms-body mb-24">
                Each participant is responsible for determining whether their participation and any related trading,
                staking, claiming, vesting, receipt or disposal of digital assets complies with laws applicable to them.
              </p>
              <p className="text-terms-body mb-24">
                A participant must not use another wallet, account, person, intermediary, nominee, technical arrangement
                or other means for the purpose of circumventing an eligibility restriction, geographic restriction,
                program limitation, reward cap, suspension, exclusion or other requirement of the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">THIRD-PARTY INFRASTRUCTURE</h2>
              <p className="text-terms-body mb-24">
                The Rewards Program may depend upon blockchain networks, smart contracts, wallets, RPC providers, APIs,
                indexers, price feeds, oracle infrastructure, bridges, hosting providers and other third-party or
                decentralized infrastructure.
              </p>
              <p className="text-terms-body mb-24">
                The use of or reliance upon such infrastructure does not mean that GMX, the GMX DAO or any GMX
                Contributor owns, operates or controls that infrastructure.
              </p>
              <p className="text-terms-body mb-24">
                To the maximum extent permitted by applicable law, no responsibility is accepted for interruption,
                delay, failure, compromise, inaccuracy, unavailability or other malfunction attributable to third-party
                or decentralized infrastructure outside the reasonable control of the relevant person.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">INTERFACE AND ONCHAIN INFORMATION</h2>
              <p className="text-terms-body mb-24">
                An interface, website, dashboard, API, indexer or other informational system may provide information
                concerning rewards, balances, transactions, staking, vesting or eligibility. Such information may be
                delayed, cached, incomplete, provisional or affected by technical errors.
              </p>
              <p className="text-terms-body mb-24">
                Where there is a discrepancy between information displayed through an interface and valid onchain
                records, the verified onchain state shall ordinarily prevail, subject to the calculation, eligibility,
                correction and anti-abuse provisions of these Terms.
              </p>
              <p className="text-terms-body mb-24">
                An interface does not itself determine blockchain finality and does not guarantee that a transaction
                displayed as pending, submitted, executed or confirmed will remain part of the canonical state of the
                relevant blockchain.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">BLOCKCHAIN FINALITY AND REORGANISATIONS</h2>
              <p className="text-terms-body mb-24">
                A transaction does not necessarily become permanently eligible for rewards merely because it initially
                appears to have been executed or confirmed.
              </p>
              <p className="text-terms-body mb-24">
                Transactions affected by blockchain reorganisations, reversions, invalidation, replacement, failed
                execution or other changes to the canonical blockchain state may be excluded from reward calculations or
                recalculated to reflect the final verified onchain state.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Program may delay finalization where reasonably necessary to establish blockchain finality
                or verify relevant onchain activity.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">GAS, EXECUTION COSTS, SLIPPAGE AND MEV</h2>
              <p className="text-terms-body mb-24">
                Participants are responsible for transaction fees, gas fees, priority fees, slippage, price impact,
                MEV-related effects and other execution costs associated with blockchain transactions.
              </p>
              <p className="text-terms-body mb-24">
                Rewards are not intended to reimburse such costs unless expressly stated otherwise. A transaction that
                fails, reverts, executes at an unexpected price or incurs unusually high transaction costs does not
                create an entitlement to compensation from the Rewards Program merely because the transaction was
                undertaken in connection with an attempt to earn, stake, vest or claim rewards.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO GUARANTEE OF AVAILABILITY</h2>
              <p className="text-terms-body mb-24">
                No representation or warranty is made that the Rewards Program, Rewards interface, claiming
                functionality, staking functionality, vesting functionality, relevant smart contracts or supporting
                infrastructure will be available continuously or at any particular time.
              </p>
              <p className="text-terms-body mb-24">
                Access may be interrupted, delayed, restricted or unavailable because of maintenance, upgrades, network
                conditions, security incidents, smart-contract events, third-party infrastructure, legal or regulatory
                requirements or other circumstances.
              </p>
              <p className="text-terms-body mb-24">
                A temporary or permanent inability to access an interface does not itself create an entitlement to
                compensation.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO RESERVATION OF PROVISIONAL REWARDS</h2>
              <p className="text-terms-body mb-24">
                The calculation or display of a provisional reward does not mean that the corresponding tokens or assets
                have been issued, transferred, segregated, earmarked, reserved or held for the participant.
              </p>
              <p className="text-terms-body mb-24">
                Until a reward has been finalized and becomes claimable in accordance with the applicable terms, the
                participant has no unconditional right to receive the provisional amount displayed.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">GT CONDITIONAL ALLOCATION</h2>
              <p className="text-terms-body mb-24">
                Any GT allocation constitutes a conditional record maintained for purposes of the Rewards Program only.
                No GT is deemed issued, sold, transferred, delivered, segregated, reserved or held on trust for a
                participant solely by reason of an allocation being displayed or calculated.
              </p>
              <p className="text-terms-body mb-24">
                Any entitlement to receive, purchase, claim or otherwise acquire GT remains subject to the applicable GT
                Terms, eligibility requirements, applicable law and completion of any required Token Generation Event,
                sale, issuance, distribution or claim process.
              </p>
              <p className="text-terms-body mb-24">
                A GT allocation does not guarantee that GT will be issued, that a Token Generation Event will occur,
                that a participant will ultimately satisfy applicable eligibility requirements, or that GT will have any
                particular utility, liquidity, transferability or monetary value.
              </p>
              <p className="text-terms-body mb-24">
                Where GT is subsequently offered for sale, distributed or otherwise made available, that transaction may
                be subject to additional terms, eligibility requirements, jurisdictional restrictions, vesting
                conditions, transfer restrictions, KYC or compliance requirements, or other conditions contained in the
                applicable GT Terms.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">GT TOKEN NOTICE AND DISCLAIMER</h2>
              <p className="text-terms-body mb-24">
                GT tokens may be made available by GMX as part of certain rewards, incentive, participation or
                promotional programmes operated by GMX (the “Incentive Programme”).
              </p>
              <p className="text-terms-body mb-24">
                GT is a separate token associated with GMTrade, a separate and independently operated protocol. GMX does
                not issue, develop, manage or control GT, the GMTrade protocol, or the development, launch, operation,
                tokenomics, functionality or future direction of GT.
              </p>
              <p className="text-terms-body mb-24">
                Any GT distributed through the Incentive Programme is distributed by GMX solely from tokens available to
                GMX for that purpose. The distribution of GT by GMX does not make GMX the issuer, operator, promoter or
                manager of GT or the GMTrade protocol and should not be interpreted as GMX assuming responsibility for
                GT or its future development.
              </p>
              <p className="text-terms-body mb-24">
                At the time GT is made available through the Incentive Programme, GT may not have launched, may not be
                transferable or tradeable, and may have limited or no functionality, utility, liquidity or market value.
                Participation in the Incentive Programme does not create any entitlement or expectation that GT will
                subsequently launch, become transferable, be listed or traded on any exchange or other venue, develop
                any particular functionality or utility, or acquire or maintain any particular value.
              </p>
              <p className="text-terms-body mb-24">
                Any decisions concerning GT, including its launch, functionality, utility, tokenomics, supply,
                distribution mechanisms, liquidity arrangements, market support, protocol integration or other future
                plans, are matters for GMTrade and the persons responsible for that protocol. Such matters are outside
                the control of GMX and may be introduced, modified, delayed, suspended or abandoned without involvement
                by GMX.
              </p>
              <p className="text-terms-body mb-24">
                GMX makes no representation, warranty or guarantee regarding the present or future status,
                functionality, utility, transferability, liquidity, market availability, adoption, price or value of GT.
                GMX does not guarantee that GT will have any future utility or monetary value.
              </p>
              <p className="text-terms-body mb-24">
                The allocation or distribution of GT through the Incentive Programme is not an initial coin offering,
                token sale or offer by GMX to sell GT. Participants are not purchasing GT from GMX through the Incentive
                Programme. GT is provided solely as an incentive or reward for qualifying participation in applicable
                programme activities, subject to the relevant programme terms.
              </p>
              <p className="text-terms-body mb-24">
                Nothing communicated by GMX concerning GT should be interpreted as investment, financial, legal or tax
                advice, a recommendation to acquire, hold or dispose of GT, or a representation regarding its future
                value or performance. Participants should not participate in the Incentive Programme on the assumption
                that GT will become tradeable, develop utility or increase in value.
              </p>
              <p className="text-terms-body mb-24">
                Any information concerning potential future developments relating to GT is indicative only unless and
                until formally confirmed by the persons responsible for GMTrade. Statements regarding possible plans,
                features, integrations, market arrangements or other developments are subject to change and should not
                be relied upon as promises, commitments or guarantees by GMX.
              </p>
              <p className="text-terms-body mb-24">
                By participating in an Incentive Programme under which GT may be distributed, participants acknowledge
                that GT is associated with a separate protocol, that its future development and characteristics are
                outside GMX's control, and that GMX assumes no responsibility for the future operation, utility,
                liquidity or value of GT.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ROUNDING, DECIMALS AND CALCULATION PRECISION</h2>
              <p className="text-terms-body mb-24">
                Reward calculations may involve decimal values, token precision, price conversions, rounding and
                limitations inherent in smart contracts, software and blockchain systems.
              </p>
              <p className="text-terms-body mb-24">
                Amounts may therefore be rounded up or down in accordance with the applicable calculation methodology.
                Minor differences resulting from rounding, decimal precision or technical calculation methodology do not
                create an entitlement to an additional reward.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SNAPSHOTS AND ELIGIBILITY DETERMINATIONS</h2>
              <p className="text-terms-body mb-24">
                Where a reward, multiplier, Staking Tier, Volume Tier, balance, qualification or other program feature
                depends upon a participant’s holdings, staking position, trading activity or other blockchain state at a
                particular time, the Rewards Program may determine eligibility using an applicable onchain snapshot,
                block number, timestamp or other objectively determined calculation point.
              </p>
              <p className="text-terms-body mb-24">
                A participant is not entitled to a particular status merely because an interface temporarily displays a
                different balance, multiplier, tier or qualification.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ERRONEOUS DISTRIBUTIONS AND RECOVERY</h2>
              <p className="text-terms-body mb-24">
                Where a reward or other asset is distributed as a result of a manifest calculation error, duplicate
                distribution, technical malfunction, oracle error, exploit, manipulation, fraud or other circumstances
                under which the participant was not entitled to receive it, the Rewards Program may, to the extent
                legally and technically permissible, correct the error.
              </p>
              <p className="text-terms-body mb-24">
                This may include cancelling an unclaimed allocation, correcting a future distribution, offsetting the
                erroneous amount against future rewards or requesting return of assets distributed in manifest error.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms requires any person to honor or repeat a payment, reward or distribution
                resulting from a manifest error.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SANCTIONS, FRAUD AND LEGAL COMPLIANCE</h2>
              <p className="text-terms-body mb-24">
                Participation may be restricted, suspended or terminated where reasonably necessary to comply with
                applicable sanctions, court orders, governmental requirements, regulatory requirements or other
                applicable laws.
              </p>
              <p className="text-terms-body mb-24">
                Rewards may be withheld or made unavailable where their distribution would be unlawful or where the
                relevant activity is reasonably identified as involving fraud, sanctions evasion, theft, exploitation or
                other unlawful conduct.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms requires GMX, the GMX DAO or any other person to undertake an action that would
                violate applicable law.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO RELIANCE ON MARKETING OR THIRD-PARTY STATEMENTS</h2>
              <p className="text-terms-body mb-24">
                Descriptions, advertisements, social-media communications, community discussions, announcements,
                examples, calculators, projections, illustrations and statements made by third parties are provided for
                informational or promotional purposes and do not amend these Terms unless expressly incorporated into
                them.
              </p>
              <p className="text-terms-body mb-24">
                Statements made by community members, token holders, governance participants, independent contributors
                or other third parties do not constitute contractual promises or representations on behalf of GMX, the
                GMX DAO or the Rewards Program merely because those persons participate in the GMX ecosystem.
              </p>
              <p className="text-terms-body mb-24">
                Participants should rely upon the applicable Terms and verified program rules when determining the
                operation of the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ILLUSTRATIVE EXAMPLES</h2>
              <p className="text-terms-body mb-24">
                Examples of reward calculations, token values, multipliers, trading activity or other outcomes are
                illustrative only and are provided to explain the applicable calculation methodology.
              </p>
              <p className="text-terms-body mb-24">
                An example does not constitute a representation or guarantee that the same or a similar outcome will
                occur for another transaction or participant. Actual rewards depend upon the applicable circumstances,
                program rules, prices, eligibility requirements and final Calculations.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ASSIGNMENT AND TRANSFER OF PROGRAM RIGHTS</h2>
              <p className="text-terms-body mb-24">
                Eligibility, Rewards Multipliers, Volume Tiers, Staking Tiers, Return Bonuses, referral status and other
                account-specific or wallet-specific benefits may not be sold, assigned, transferred or otherwise
                conveyed to another person or wallet except where expressly permitted by the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                A transfer of tokens between wallets does not automatically transfer historical trading volume,
                multiplier status, reward eligibility or other program benefits associated with the transferring wallet.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">FORCE MAJEURE</h2>
              <p className="text-terms-body mb-24">
                No GMX Protected Party shall be responsible for delay, interruption, suspension, failure or inability to
                perform an obligation arising from circumstances beyond that person’s reasonable control, including
                blockchain or network failures, cyberattacks, exploits, denial-of-service attacks, telecommunications
                failures, power failures, oracle failures, third-party infrastructure failures, acts of government,
                changes in law, sanctions, regulatory action, war, civil unrest, natural disasters, fire, flood or other
                comparable events.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in this provision excludes liability that cannot lawfully be excluded.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">
                RELEASE AND LIMITATION OF LIABILITY OF GMX DAO AND ASSOCIATED PERSONS
              </h2>
              <p className="text-terms-body mb-24">
                For purposes of these Terms, “GMX Protected Parties” means, collectively and individually, the GMX DAO,
                its members and participants, governance participants, token holders acting in such capacity, delegates,
                developers, contributors, consultants, advisers, contractors, service providers, administrators,
                maintainers, interface providers, agents and other persons involved in developing, supporting,
                maintaining or administering the Rewards Program or GMX protocol, together with their respective
                officers, directors, employees, representatives and agents where applicable.
              </p>
              <p className="text-terms-body mb-24">
                To the maximum extent permitted by applicable law, each participant participates in the Rewards Program
                and interacts with the relevant blockchain systems, smart contracts, tokens and interfaces at their own
                risk and releases the GMX Protected Parties from liability arising out of or in connection with
                participation in the Rewards Program except to the extent that liability cannot lawfully be excluded.
              </p>
              <p className="text-terms-body mb-24">
                To the maximum extent permitted by applicable law, no GMX Protected Party shall be liable, whether in
                contract, tort (including negligence), breach of statutory duty, misrepresentation, restitution or
                otherwise, for any loss, damage, liability, cost or expense arising out of or in connection with the
                Rewards Program, staking, trading undertaken in connection with the Rewards Program, a reward
                calculation, reward allocation, Rewards Multiplier, referral reward, esGMX, GT allocation, token value,
                vesting, claiming, blockchain transaction, smart contract, wallet, oracle, interface or supporting
                infrastructure.
              </p>
              <p className="text-terms-body mb-24">
                Without limiting the foregoing, and to the maximum extent permitted by applicable law, the GMX Protected
                Parties shall not be liable for loss of profits, loss of anticipated savings, loss of opportunity, loss
                of revenue, loss of business, loss of goodwill, loss of data, loss of tokens, loss of anticipated
                rewards, trading losses, liquidation losses, loss arising from token-price movements, or any indirect,
                incidental, special, exemplary, punitive or consequential loss.
              </p>
              <p className="text-terms-body mb-24">
                The limitations and releases in these Terms are intended to apply separately for the benefit of each GMX
                Protected Party and shall apply whether or not the relevant loss was foreseeable and whether or not a
                participant had been advised of the possibility of that loss, in each case to the maximum extent
                permitted by applicable law.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms excludes or limits liability for fraud or fraudulent misrepresentation, death or
                personal injury caused by negligence, or any other liability which cannot lawfully be excluded or
                limited.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO THIRD-PARTY RIGHTS EXCEPT GMX PROTECTED PARTIES</h2>
              <p className="text-terms-body mb-24">
                Except for the GMX Protected Parties expressly identified in these Terms, a person who is not a party to
                these Terms shall have no right under the Contracts (Rights of Third Parties) Act 1999 to enforce any
                provision of these Terms.
              </p>
              <p className="text-terms-body mb-24">
                Each GMX Protected Party is expressly intended to have the benefit of, and may enforce, the provisions
                of these Terms that confer a release, limitation of liability, exclusion, indemnity or other protection
                upon that GMX Protected Party in accordance with the Contracts (Rights of Third Parties) Act 1999.
              </p>
              <p className="text-terms-body mb-24">
                The parties may amend, modify, suspend or terminate these Terms without requiring the consent of any GMX
                Protected Party.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SURVIVAL</h2>
              <p className="text-terms-body mb-24">
                Any provision which by its nature is intended to continue following withdrawal from, suspension or
                termination of the Rewards Program shall survive such withdrawal, suspension or termination.
              </p>
              <p className="text-terms-body mb-24">
                This includes provisions relating to risk allocation, erroneous distributions, recovery, prohibited
                conduct, limitation and exclusion of liability, releases, indemnities, governing law, arbitration,
                third-party rights and any accrued rights or obligations.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ORDER OF PRECEDENCE</h2>
              <p className="text-terms-body mb-24">
                These Terms govern the Rewards Program generally. Additional terms may apply to a particular campaign,
                token, distribution, sale, feature or activity.
              </p>
              <p className="text-terms-body mb-24">
                Where there is an inconsistency, specific terms applicable to a particular feature or transaction shall
                prevail over these general Rewards Program Terms solely in relation to that feature or transaction.
              </p>
              <p className="text-terms-body mb-24">
                In particular, the applicable GT Terms shall prevail in relation to the sale, issuance, distribution,
                claiming, vesting, transfer or other acquisition of GT. Nothing in these Rewards Program Terms overrides
                additional eligibility, compliance, jurisdictional or transfer requirements imposed under the applicable
                GT Terms.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">WALLET IDENTIFICATION AND ATTRIBUTION</h2>
              <p className="text-terms-body mb-24">
                For purposes of administering the Rewards Program, activity conducted through a wallet may be attributed
                to the participant controlling or authorizing use of that wallet.
              </p>
              <p className="text-terms-body mb-24">
                The use of a wallet address for program administration does not constitute a representation that a
                blockchain address conclusively establishes the legal identity, ownership or beneficial ownership of any
                person.
              </p>
              <p className="text-terms-body mb-24">
                Participants are responsible for ensuring that wallets through which they participate are under their
                lawful control or are being used with appropriate authority.
              </p>
              <p className="text-terms-body mb-24">
                A change of wallet does not automatically transfer historical trading volume, Rewards Multipliers,
                Staking Tiers, Volume Tiers, referral status, Return Bonuses, reward eligibility or other
                wallet-specific benefits.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ELECTRONIC COMMUNICATIONS AND NOTICES</h2>
              <p className="text-terms-body mb-24">
                Information relating to the Rewards Program may be provided electronically, including through the
                applicable interface, website, protocol documentation or other official communication channels
                designated for the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                Participants consent to receiving program-related notices electronically. A notice made generally
                available through an official Rewards Program interface or designated official communication channel may
                constitute notice to participants where individual notice is not reasonably practicable.
              </p>
              <p className="text-terms-body mb-24">
                Participants are responsible for reviewing applicable Terms and material program information when
                participating in the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">AMENDMENTS AND VERSION CONTROL</h2>
              <p className="text-terms-body mb-24">
                These Terms may be amended from time to time in accordance with the provisions governing changes to the
                Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                The applicable version of these Terms may identify its effective date or last-updated date. Unless
                otherwise expressly stated, amendments apply prospectively from their effective date.
              </p>
              <p className="text-terms-body mb-24">
                Where reasonably practicable, material amendments will be made available through the applicable
                interface or another official communication channel. Continued participation after an amendment becomes
                effective constitutes acceptance of the amended Terms where permitted by applicable law.
              </p>
              <p className="text-terms-body mb-24">
                Changes will not retrospectively alter a finalized reward solely by reason of a subsequent amendment
                unless correction is otherwise permitted under these Terms because of error, fraud, manipulation,
                exploitation or another expressly identified Circumstance.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">PROTOCOL, GOVERNANCE AND SMART-CONTRACT CHANGES</h2>
              <p className="text-terms-body mb-24">
                GMX and the blockchain systems with which it interacts may evolve over time.
              </p>
              <p className="text-terms-body mb-24">
                Governance decisions, smart-contract upgrades, protocol migrations, forks, network upgrades, technical
                changes or other developments may modify functionality relevant to the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program does not create an entitlement to continued availability of any
                particular smart contract, protocol architecture, blockchain network, interface, staking mechanism,
                vesting mechanism, token functionality or other technical feature.
              </p>
              <p className="text-terms-body mb-24">
                Where reasonably necessary, the Rewards Program may be adapted to accommodate a protocol upgrade,
                migration, governance decision, blockchain fork or comparable technical development.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO OBLIGATION TO REVERSE OR RECOVER BLOCKCHAIN TRANSACTIONS</h2>
              <p className="text-terms-body mb-24">
                Blockchain transactions may be irreversible. No GMX Protected Party is obligated to reverse, cancel,
                modify, replace or recover a blockchain transaction, token or digital asset because a participant has
                made an error, interacted with an incorrect address or smart contract, lost access to a wallet,
                disclosed private credentials or otherwise undertaken an unintended transaction.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that any GMX Protected Party has the technical
                ability, legal authority or practical ability to alter the state of a blockchain or reverse an executed
                transaction.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SECURITY INCIDENTS AND EMERGENCY ACTION</h2>
              <p className="text-terms-body mb-24">
                Where an actual or suspected exploit, vulnerability, cyberattack, oracle failure, smart-contract
                malfunction, market manipulation event, blockchain incident or other security threat affects or may
                affect the Rewards Program, relevant functionality may be suspended, restricted or modified without
                prior notice where reasonably necessary to protect users, the protocol, smart contracts, program assets
                or the integrity of the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                Such measures may include temporarily suspending reward calculations, finalization, claims,
                staking-related functionality, vesting functionality or other affected features while the relevant issue
                is investigated or addressed.
              </p>
              <p className="text-terms-body mb-24">
                Taking emergency action does not constitute an assumption of responsibility for the event giving rise to
                that action.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">RECORDS AND EVIDENCE</h2>
              <p className="text-terms-body mb-24">
                Blockchain records, smart-contract records, transaction hashes, wallet signatures, applicable snapshots,
                system records and other electronic records may be relied upon when determining participation,
                eligibility, calculations, claims and other matters relating to the Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                Where different data sources conflict, the Rewards Program may determine the applicable record by
                reference to verified onchain information and other reasonably reliable technical evidence.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in this provision prevents correction of a record or calculation where these Terms otherwise
                permit correction.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">LANGUAGE</h2>
              <p className="text-terms-body mb-24">
                These Terms are prepared in English. Where a translation is provided, it is provided for convenience
                unless expressly stated otherwise.
              </p>
              <p className="text-terms-body mb-24">
                To the extent permitted by applicable law, the English-language version shall prevail in the event of
                any inconsistency, ambiguity or difference between the English version and a translation.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">INTERPRETATION</h2>
              <p className="text-terms-body mb-24">
                Headings are included for convenience and do not affect interpretation. References to a person include
                an individual, company, partnership, association, decentralized organization and other legal or
                organizational form where the context permits.
              </p>
              <p className="text-terms-body mb-24">
                Words such as “including”, “includes” and similar expressions shall be interpreted as illustrative and
                shall not limit the words preceding them.
              </p>
              <p className="text-terms-body mb-24">
                A reference to applicable law includes applicable legislation, regulations, regulatory requirements and
                legally binding orders as amended or replaced from time to time.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">CUMULATIVE RIGHTS AND REMEDIES</h2>
              <p className="text-terms-body mb-24">
                Except where expressly stated otherwise, rights and remedies arising under these Terms are cumulative
                and do not exclude rights or remedies available under applicable law.
              </p>
              <p className="text-terms-body mb-24">
                The exercise of one right or remedy does not prevent the exercise of another right or Remedy.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO ASSIGNMENT BY PARTICIPANT</h2>
              <p className="text-terms-body mb-24">
                A participant may not assign, transfer, novate or otherwise dispose of their contractual rights or
                obligations under these Terms without prior written approval where such approval is required by the
                Rewards Program.
              </p>
              <p className="text-terms-body mb-24">
                A blockchain transfer of GMX, esGMX, GT or another digital asset does not itself constitute an
                assignment of the transferring participant’s contractual rights, historical trading activity, Rewards
                Multiplier, tier status or other Rewards Program benefits.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">CONTRACTING AND PROTOCOL STRUCTURE</h2>
              <p className="text-terms-body mb-24">
                Participation in a decentralized protocol, interaction with smart contracts, holding a governance token
                or participation in decentralized governance does not, by itself, establish a partnership, incorporated
                association, joint venture, agency or other legal relationship between participants, token holders,
                governance participants or GMX Protected Parties.
              </p>
              <p className="text-terms-body mb-24">
                No participant may represent that they have authority to bind the GMX DAO, another governance
                participant, contributor, consultant, contractor or other GMX Protected Party solely by reason of
                participation in GMX governance or the GMX ecosystem.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">JURISDICTION-SPECIFIC PROVISIONS</h2>
              <p className="text-terms-body mb-24">
                The following provisions apply in addition to the remainder of these Terms where a participant is
                resident, located or otherwise subject to the laws of the relevant jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in this section constitutes a representation that the Rewards Program, GMX, esGMX, GT, staking,
                trading or any other related activity is regulated, unregulated, authorised, approved or exempt from
                regulation in any jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                Where participation, a reward, token, distribution, staking feature, trading feature or other activity
                cannot lawfully be provided or made available to a particular participant, that activity may be
                restricted, suspended or unavailable notwithstanding anything elsewhere in these Terms.
              </p>
              <p className="text-terms-body mb-24">
                Participants are responsible for determining the laws applicable to them and for complying with those
                laws.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">UNITED KINGDOM</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program to persons in the United Kingdom is subject to applicable United
                Kingdom financial-services, financial-promotion, cryptoasset and other laws and regulations.
              </p>
              <p className="text-terms-body mb-24">
                Nothing contained within the Rewards Program, these Terms or any associated communication constitutes a
                representation that GMX, esGMX, GT, the Rewards Program or any associated activity has been approved,
                endorsed or authorised by the Financial Conduct Authority or any other United Kingdom regulatory
                authority.
              </p>
              <p className="text-terms-body mb-24">
                Where a communication concerning the Rewards Program constitutes a financial promotion for purposes of
                United Kingdom law, that communication is subject to applicable requirements governing the communication
                of financial promotions.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms overrides any risk warning, cooling-off requirement, investor categorisation,
                appropriateness assessment, eligibility requirement, restriction on incentives or other requirement that
                applies under United Kingdom law.
              </p>
              <p className="text-terms-body mb-24">
                The availability of a reward, Rewards Multiplier, staking feature, GT allocation or other incentive to
                persons in the United Kingdom may consequently differ from its availability in other jurisdictions.
              </p>
              <p className="text-terms-body mb-24">
                Cryptoassets are capable of substantial price volatility and participants may lose some or all of the
                value associated with cryptoassets used in connection with the Rewards Program. Rewards are not
                guaranteed and should not be treated as interest, guaranteed yield, guaranteed income or compensation
                for trading losses.
              </p>
              <p className="text-terms-body mb-24">
                A participant should not undertake additional trading activity, acquire additional cryptoassets or stake
                additional GMX or esGMX solely for the purpose of obtaining or increasing rewards without independently
                considering the risks and costs of the underlying activity.
              </p>
              <p className="text-terms-body mb-24">
                Where United Kingdom law requires a particular warning, disclosure or consumer journey to accompany a
                communication or activity, the applicable warning, disclosure or consumer journey shall apply in
                addition to these Terms.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">UNITED STATES</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program to persons in the United States is subject to applicable federal and
                state laws.
              </p>
              <p className="text-terms-body mb-24">
                No representation or warranty is made concerning the classification of GMX, esGMX, GT, the Rewards
                Program, the Staking Multiplier or any associated activity under United States federal or state
                securities, commodities, derivatives, money-transmission, banking, tax or other laws.
              </p>
              <p className="text-terms-body mb-24">
                References to “staking” within the Rewards Program describe the particular GMX mechanism set out in
                these Terms. They do not constitute a representation that the activity is “Protocol Staking”,
                proof-of-stake consensus participation or any other category described by the United States Securities
                and Exchange Commission or another United States authority.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes an offer or sale of a security, commodity interest or other regulated
                financial product in circumstances where such offer or sale would be unlawful.
              </p>
              <p className="text-terms-body mb-24">
                No representation is made that any activity falls within any regulatory exclusion, exemption, safe
                harbour, staff statement or other regulatory position. The regulatory treatment of an activity may
                depend upon its particular facts and circumstances.
              </p>
              <p className="text-terms-body mb-24">
                Participants are responsible for determining and satisfying their federal, state and local tax
                obligations arising from rewards, token distributions, trading, staking, vesting, disposals or other
                digital-asset transactions.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Program may restrict particular tokens, rewards, distributions, activities or features for
                United States participants where reasonably considered necessary to comply with applicable law.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">EUROPEAN UNION AND EUROPEAN ECONOMIC AREA</h2>
              <p className="text-terms-body mb-24">
                Availability within the European Union and European Economic Area is subject to Regulation (EU)
                2023/1114 on markets in crypto-assets (“MiCA”), where applicable, together with other applicable
                European Union and national laws.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that GMX, esGMX, GT or any associated activity is a
                crypto-asset, crypto-asset service, financial instrument or other regulated activity of any particular
                classification for purposes of MiCA or other European Union legislation.
              </p>
              <p className="text-terms-body mb-24">
                References to staking within these Terms describe the specific Rewards Program mechanism and should not
                be interpreted as a representation that the relevant activity constitutes validator staking,
                staking-as-a-service or another legally defined service.
              </p>
              <p className="text-terms-body mb-24">
                Unless expressly stated otherwise in relation to a particular service, participation in the Rewards
                Program does not involve any GMX Protected Party taking custody of a participant's cryptoassets or
                staking a participant's assets for its own account.
              </p>
              <p className="text-terms-body mb-24">
                Participants remain responsible for transactions initiated through their wallets and interactions with
                applicable smart contracts.
              </p>
              <p className="text-terms-body mb-24">
                Where a token, distribution, service or communication is subject to additional requirements under MiCA
                or other applicable European Union or national legislation, availability may be restricted until those
                requirements have been satisfied.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">MAINLAND CHINA</h2>
              <p className="text-terms-body mb-24">
                The Rewards Program and related virtual-asset activities are not offered or made available to persons
                located or ordinarily resident in Mainland China where such offering, access or participation would
                contravene applicable law.
              </p>
              <p className="text-terms-body mb-24">
                A person must not access or participate in the Rewards Program from Mainland China where participation
                is prohibited by applicable law.
              </p>
              <p className="text-terms-body mb-24">
                Participants must not use a VPN, proxy, intermediary, nominee, alternative wallet, false information or
                other technical or organizational means for the purpose of circumventing a geographic restriction
                applied to Mainland China.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes an invitation, solicitation, marketing communication or offer
                directed to persons in Mainland China in circumstances where such communication or activity is
                prohibited by applicable law.
              </p>
              <p className="text-terms-body mb-24">
                No person has any entitlement to participate merely because a blockchain, smart contract, website or
                other decentralized or technical infrastructure remains technically accessible from Mainland China.
              </p>
              <p className="text-terms-body mb-24">
                Where a wallet or participant is reasonably determined to be participating from a prohibited
                jurisdiction, access to Rewards Program functionality, rewards, distributions or other features may be
                restricted to the extent legally and technically permissible.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">HONG KONG</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program to persons in Hong Kong is subject to applicable Hong Kong
                virtual-asset, securities and financial-services laws.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that GMX, esGMX, GT, the Rewards Program or any
                associated staking activity has been authorised, approved or endorsed by the Securities and Futures
                Commission of Hong Kong.
              </p>
              <p className="text-terms-body mb-24">
                References to staking describe the particular GMX Rewards Program mechanism set out in these Terms and
                do not constitute a representation that GMX provides staking services of the kind provided by a licensed
                virtual asset trading platform.
              </p>
              <p className="text-terms-body mb-24">
                Participants acknowledge that staking and staking-related arrangements may involve technical,
                smart-contract, cybersecurity, liquidity, lock-up, validator, slashing and legal risks where applicable
                to the particular mechanism being used.
              </p>
              <p className="text-terms-body mb-24">
                No fixed or guaranteed rate of return is promised. Any displayed reward, multiplier, token amount or
                estimated value remains subject to the applicable Rewards Program rules.
              </p>
              <p className="text-terms-body mb-24">
                Where Hong Kong law requires an activity to be conducted by or through an appropriately licensed or
                authorised person, nothing in these Terms authorises GMX or any GMX Protected Party to undertake that
                activity without the required authorisation.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">UNITED ARAB EMIRATES</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program within the United Arab Emirates is subject to the regulatory
                requirements applicable within the relevant Emirate or financial free zone and to the nature of the
                activity undertaken.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that GMX, esGMX, GT, the Rewards Program or any
                associated activity has been licensed, approved or endorsed by the Virtual Assets Regulatory Authority,
                the Securities and Commodities Authority, the Dubai Financial Services Authority, the Financial Services
                Regulatory Authority or any other United Arab Emirates regulatory authority.
              </p>
              <p className="text-terms-body mb-24">
                References to staking describe the specific Rewards Program mechanism set out in these Terms and do not
                constitute a representation that GMX or a GMX Protected Party provides a custodial staking service.
              </p>
              <p className="text-terms-body mb-24">
                Unless expressly stated otherwise, participants retain control of their wallets and are responsible for
                authorising their interactions with applicable smart contracts.
              </p>
              <p className="text-terms-body mb-24">
                Where a particular activity would constitute a regulated virtual-asset service or other regulated
                financial activity within the jurisdiction applicable to a participant, that activity may be restricted
                or unavailable unless and until applicable regulatory requirements have been satisfied.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in the Rewards Program should be understood as a representation that a participant's assets are
                held in regulated custody, segregated client accounts or another regulated safeguarding arrangement
                unless expressly stated otherwise.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">AUSTRALIA</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program to Australian participants is subject to applicable Australian
                financial-services, financial-product and consumer-protection laws.
              </p>
              <p className="text-terms-body mb-24">
                No representation is made that GMX, esGMX, GT, the Rewards Program, the Staking Multiplier or any
                related arrangement is or is not a financial product, managed investment scheme, facility for making a
                financial investment or financial service under Australian law.
              </p>
              <p className="text-terms-body mb-24">
                The legal characterization of an arrangement depends upon its particular rights, benefits and operation
                and is not determined merely by describing that arrangement as “staking”, “rewards”, a “token” or a
                decentralized protocol.
              </p>
              <p className="text-terms-body mb-24">
                References to staking within these Terms describe the specific GMX Rewards Program mechanism and do not
                represent that the activity constitutes native proof-of-stake validation.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes financial product advice or a recommendation to acquire, dispose of,
                stake or trade any cryptoasset.
              </p>
              <p className="text-terms-body mb-24">
                No representation is made that any person associated with the Rewards Program holds an Australian
                Financial Services Licence or other Australian authorisation unless expressly stated.
              </p>
              <p className="text-terms-body mb-24">
                Where an Australian licence, disclosure document, authorization or other regulatory requirement is
                applicable to a particular activity, nothing in these Terms permits that activity to be provided
                contrary to that requirement.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">JAPAN</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program to persons in Japan is subject to applicable Japanese laws governing
                cryptoassets, financial instruments and related services.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that GMX, esGMX, GT, the Rewards Program or any
                associated activity has been registered, authorised or approved by the Financial Services Agency of
                Japan.
              </p>
              <p className="text-terms-body mb-24">
                References to staking describe the particular GMX Rewards Program mechanism and do not constitute a
                representation that GMX accepts deposits of cryptoassets for purposes of providing a regulated staking
                service.
              </p>
              <p className="text-terms-body mb-24">
                Participants acknowledge that staking arrangements may, depending upon their structure, involve
                liquidity, lock-up, technical, validator and slashing risks. The GMX Rewards Program may involve
                different risks because the Staking Multiplier operates according to the specific mechanics described in
                these Terms.
              </p>
              <p className="text-terms-body mb-24">
                No person should treat the use of the term “staking” as determining the regulatory classification of the
                Rewards Program under Japanese law.
              </p>
              <p className="text-terms-body mb-24">
                Where registration or other regulatory authorization is required for a particular service made available
                to persons in Japan, that service may be restricted or unavailable unless applicable requirements have
                been satisfied.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">SWITZERLAND</h2>
              <p className="text-terms-body mb-24">
                Availability of the Rewards Program to persons in Switzerland is subject to applicable Swiss
                financial-market laws.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that GMX, esGMX, GT, the Rewards Program or any
                related activity has been licensed, supervised, authorised or approved by the Swiss Financial Market
                Supervisory Authority (“FINMA”).
              </p>
              <p className="text-terms-body mb-24">
                References to staking describe the particular GMX Rewards Program mechanism and do not constitute a
                representation that GMX provides custodial staking or validator services.
              </p>
              <p className="text-terms-body mb-24">
                Where relevant to a particular staking mechanism, participants should consider technical risks,
                smart-contract risks, validator risks, slashing risks, counterparty risks, market risks, lock-up periods
                and delays associated with unstaking.
              </p>
              <p className="text-terms-body mb-24">
                Unless expressly stated otherwise, no representation is made that assets used in connection with the
                Rewards Program are held in regulated custody, are segregated from the assets of another person or would
                receive any particular treatment in an Insolvency.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">OTHER JURISDICTIONS</h2>
              <p className="text-terms-body mb-24">
                The absence of a jurisdiction-specific provision does not mean that participation is lawful, authorised,
                regulated or unrestricted in that jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Program is available only to the extent permitted by applicable law. A participant must not
                interpret technical accessibility of a website, blockchain, smart contract, interface or other
                functionality as confirmation that participation is legally permitted in their jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                The Rewards Program may impose additional geographic, eligibility, compliance or distribution
                restrictions where reasonably necessary to address applicable legal or regulatory requirements.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">MEANING OF “STAKING” FOR PURPOSES OF THESE TERMS</h2>
              <p className="text-terms-body mb-24">
                References to “staking”, the “Staking Multiplier”, a “Staking Tier” or similar expressions within these
                Terms describe the particular GMX Rewards Program mechanics expressly set out in these Terms.
              </p>
              <p className="text-terms-body mb-24">
                Unless expressly stated otherwise, those expressions do not represent that the relevant activity
                constitutes proof-of-stake validator staking, delegated validator staking, staking-as-a-service,
                custody, lending, deposit-taking, collective investment, investment management or any other particular
                legally or regulatorily defined activity.
              </p>
              <p className="text-terms-body mb-24">
                The regulatory characterization of an activity is determined by applicable law and the actual
                characteristics of the relevant arrangement rather than the terminology used to describe it.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">JURISDICTIONAL CONFLICT</h2>
              <p className="text-terms-body mb-24">
                If a jurisdiction-specific provision imposes a greater restriction than another provision of these
                Terms, the jurisdiction-specific restriction shall apply to the affected participant to the extent
                required by applicable law.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these jurisdiction-specific provisions limits any mandatory right or protection which cannot
                lawfully be excluded under the law applicable to a participant.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">MASTER FINANCIAL, REWARDS AND ECONOMIC DISCLAIMER</h2>
              <p className="text-terms-body mb-24">
                The Rewards Program is a promotional and incentive mechanism associated with participation in the GMX
                ecosystem. Nothing in the Rewards Program, these Terms, any Rewards Multiplier, staking mechanism,
                reward calculation, token allocation, percentage, estimated value or other program feature is intended
                to constitute, or should be understood as constituting, a bank account, deposit, savings product,
                investment product, managed investment, collective investment, loan, credit arrangement, insurance
                product, interest-bearing account, guaranteed-return product or other financial product or financial
                service.
              </p>
              <p className="text-terms-body mb-24">
                Nothing made available through the Rewards Program constitutes investment advice, financial advice,
                trading advice, portfolio management, investment management, brokerage, dealing, arranging,
                solicitation, personal recommendation or advice concerning the merits of acquiring, holding, staking,
                trading, selling or otherwise dealing with any digital asset.
              </p>
              <p className="text-terms-body mb-24">
                No GMX Protected Party undertakes to manage a participant's assets, generate a financial return for a
                participant, protect a participant against loss, preserve the value of a participant's assets or
                determine whether participation is financially appropriate for that participant.
              </p>
              <p className="text-terms-body mb-24">
                The terminology used by the Rewards Program, including “rewards”, “staking”, “Staking Multiplier”,
                “Volume Tier”, “reward rate”, “multiplier”, “allocation”, “earned”, “value”, “eligible”, “claimable” and
                similar expressions, describes the operation of the Rewards Program only. Such terminology does not, by
                itself, establish the legal or regulatory characterization of any activity, token, transaction or
                arrangement.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO GUARANTEED PERCENTAGES, RATES OR RETURNS</h2>
              <p className="text-terms-body mb-24">
                Any percentage, multiplier, rate, ratio, reward calculation, estimated token amount, estimated monetary
                value, projected reward or other numerical figure displayed, described or referred to in connection with
                the Rewards Program is provided solely for purposes of describing or estimating the operation of the
                Rewards Program under the conditions applicable at that time.
              </p>
              <p className="text-terms-body mb-24">
                No percentage, multiplier, rate, ratio or other figure constitutes a guaranteed rate of return, interest
                rate, yield, APY, APR, investment return, profit, income or guaranteed payment.
              </p>
              <p className="text-terms-body mb-24">
                A statement that an eligible activity may generate rewards calculated by reference to a particular
                percentage does not mean that a participant is guaranteed to receive that percentage of their
                expenditure, trading fees, position value, deposited assets, staked assets or any other amount.
              </p>
              <p className="text-terms-body mb-24">
                Reward percentages and multipliers describe calculation mechanics only. They do not represent the
                economic return that a participant will receive from trading, staking, holding or otherwise using any
                digital asset.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REWARDS ARE NOT INTEREST OR YIELD</h2>
              <p className="text-terms-body mb-24">
                Rewards are not represented as interest accruing upon money or digital assets and should not be
                interpreted as a guaranteed yield generated by staking or holding GMX, esGMX or any other asset.
              </p>
              <p className="text-terms-body mb-24">
                Staking GMX or esGMX for purposes of the Rewards Program may affect the Rewards Multiplier applicable to
                otherwise eligible activity. It does not create an entitlement to interest, passive income, a fixed
                yield or any minimum amount of rewards.
              </p>
              <p className="text-terms-body mb-24">
                A participant may stake assets and receive no rewards where the other applicable conditions of the
                Rewards Program are not satisfied.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ECONOMIC OUTCOMES ARE OUTSIDE GMX&#x27;S CONTROL</h2>
              <p className="text-terms-body mb-24">
                The ultimate economic outcome experienced by a participant may depend upon circumstances outside the
                control of GMX and the GMX Protected Parties, including market prices, liquidity, volatility, trading
                activity, blockchain conditions, network fees, gas costs, funding costs, borrowing costs, slippage,
                price impact, liquidation events, oracle information, third-party infrastructure, smart-contract
                operation, token liquidity, token transferability, taxation and changes in law or regulation.
              </p>
              <p className="text-terms-body mb-24">
                Accordingly, no GMX Protected Party controls or guarantees the ultimate monetary value, purchasing
                power, market value or economic benefit of a reward received by a participant.
              </p>
              <p className="text-terms-body mb-24">
                The fact that a reward is calculated or displayed by reference to a United States dollar value or
                another fiat currency does not mean that the reward is redeemable for that amount, that any person will
                purchase the reward for that amount, or that the participant will ultimately realise that amount.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">TOKEN PRICES AND DISPLAYED VALUES</h2>
              <p className="text-terms-body mb-24">
                Any fiat, dollar or other monetary value attributed to GMX, esGMX, GT or another digital asset is an
                indicative or calculation value determined using the applicable pricing methodology.
              </p>
              <p className="text-terms-body mb-24">
                A displayed value is not a redemption price, guaranteed market price, guaranteed sale price, valuation
                opinion, price undertaking or promise that liquidity will exist at that price.
              </p>
              <p className="text-terms-body mb-24">
                Digital-asset prices may change materially between calculation, allocation, finalization, claiming,
                vesting, transfer and disposal. A reward calculated as having a particular value may subsequently have a
                materially lower value, no readily ascertainable market value or no realizable monetary value.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO GUARANTEE OF TOKEN VALUE OR LIQUIDITY</h2>
              <p className="text-terms-body mb-24">
                No representation, warranty or guarantee is made that GMX, esGMX, GT or any other reward will maintain
                any particular value, have any minimum value, increase in value, remain liquid, become liquid, be
                transferable, remain transferable or be capable of being sold or exchanged.
              </p>
              <p className="text-terms-body mb-24">
                A participant may be unable to sell, transfer, vest, exchange or otherwise realise the perceived value
                of a reward.
              </p>
              <p className="text-terms-body mb-24">
                No GMX Protected Party is obligated to create, provide or maintain a market, exchange, liquidity pool,
                purchaser, redemption facility or other exit mechanism for any reward or token merely because that asset
                forms part of the Rewards Program.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">TRADING LOSSES MAY EXCEED REWARDS</h2>
              <p className="text-terms-body mb-24">
                Participation in the Rewards Program does not reduce the financial risks associated with trading.
              </p>
              <p className="text-terms-body mb-24">
                A participant may incur trading losses, liquidation losses, funding costs, borrowing costs, position
                fees, transaction fees, gas costs, slippage, price impact and other costs which substantially exceed the
                value of any reward received.
              </p>
              <p className="text-terms-body mb-24">
                A participant should not interpret a reward percentage or Rewards Multiplier as reducing the effective
                risk of a trade or guaranteeing that undertaking additional trading activity will be economically
                beneficial.
              </p>
              <p className="text-terms-body mb-24">
                Rewards do not constitute insurance, reimbursement or compensation for trading losses and do not
                establish a minimum economic outcome for any transaction.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO GUARANTEE THAT REWARDS WILL OFFSET FEES</h2>
              <p className="text-terms-body mb-24">
                Even where rewards are calculated by reference to eligible position fees, there is no guarantee that the
                value ultimately realised from those rewards will equal or exceed any portion of the fees paid by a
                participant.
              </p>
              <p className="text-terms-body mb-24">
                A calculation described as representing a percentage of an eligible fee is a reward-calculation
                methodology only. It is not a rebate, refund, reimbursement or contractual undertaking to return that
                percentage of the participant's fees in cash or assets having an equivalent realizable value.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO RELIANCE ON ESTIMATES OR PROJECTIONS</h2>
              <p className="text-terms-body mb-24">
                Calculators, dashboards, interfaces, examples, projections, estimates, illustrations and other
                information concerning potential rewards are illustrative and informational only.
              </p>
              <p className="text-terms-body mb-24">
                Participants must not rely upon an estimated or projected reward when determining whether to trade,
                stake, acquire, hold or dispose of a digital asset.
              </p>
              <p className="text-terms-body mb-24">
                Actual rewards may differ materially from estimates because of eligibility requirements, pricing
                changes, calculation adjustments, blockchain conditions, program changes, technical issues, corrections,
                token restrictions or other circumstances permitted under these Terms.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO REPRESENTATION OF PROFITABILITY</h2>
              <p className="text-terms-body mb-24">
                Nothing in the Rewards Program constitutes a representation that participation, staking, trading or any
                other activity will be profitable.
              </p>
              <p className="text-terms-body mb-24">
                The existence of a reward does not mean that the underlying activity has a positive expected return or
                is financially advantageous.
              </p>
              <p className="text-terms-body mb-24">
                A participant is solely responsible for determining whether a transaction is appropriate having regard
                to that participant's circumstances, objectives, risk tolerance and applicable legal, regulatory and tax
                position.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO FINANCIAL RELIANCE</h2>
              <p className="text-terms-body mb-24">
                Participants should make their own independent assessment of any trading, staking or digital-asset
                activity and, where appropriate, obtain independent professional financial, legal, regulatory and tax
                advice.
              </p>
              <p className="text-terms-body mb-24">
                No participant should enter into a transaction in reliance upon the availability, estimated amount,
                monetary value or future value of a reward.
              </p>
              <p className="text-terms-body mb-24">
                No statement concerning rewards should be understood as encouraging a participant to increase trading
                volume, increase risk exposure, acquire additional digital assets or stake additional assets without
                independently assessing the underlying activity.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">REGULATORY CHARACTERIZATION</h2>
              <p className="text-terms-body mb-24">
                No representation or warranty is made concerning the legal or regulatory characterization of the Rewards
                Program, GMX, esGMX, GT, staking, Rewards Multipliers or any associated activity in any jurisdiction.
              </p>
              <p className="text-terms-body mb-24">
                Although the Rewards Program is not intended or represented as providing participants with banking,
                investment-management, brokerage, advisory or other regulated financial services, the regulatory
                characterization of any activity is ultimately determined by applicable law and the facts and
                circumstances of the relevant arrangement.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in these Terms constitutes a representation that an activity is outside the jurisdiction of a
                financial, securities, commodities, virtual-asset or other regulatory authority.
              </p>
              <p className="text-terms-body mb-24">
                Where an activity would require authorization, registration, licensing or other regulatory approval in a
                particular jurisdiction, nothing in these Terms authorizes that activity to be undertaken without
                satisfying the applicable requirement.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">NO GOVERNMENTAL OR REGULATORY PROTECTION</h2>
              <p className="text-terms-body mb-24">
                Unless expressly stated otherwise, participation in the Rewards Program is not represented as benefiting
                from any deposit guarantee, investor compensation scheme, financial-services compensation scheme,
                government insurance program or comparable statutory protection.
              </p>
              <p className="text-terms-body mb-24">
                No representation is made that losses associated with GMX, esGMX, GT, trading, staking or rewards will
                be reimbursed by a governmental authority, regulator, compensation scheme or GMX Protected Party.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">TAXATION</h2>
              <p className="text-terms-body mb-24">
                Rewards, staking, trading, vesting, claiming, token distributions, token sales and other digital-asset
                activities may give rise to tax liabilities.
              </p>
              <p className="text-terms-body mb-24">
                GMX and the GMX Protected Parties do not undertake to determine, calculate, withhold, report or
                discharge a participant's tax liabilities except where expressly required by applicable law.
              </p>
              <p className="text-terms-body mb-24">
                The tax treatment of rewards may differ between participants and jurisdictions and may change over time.
                Participants are solely responsible for determining their own tax position and obtaining professional
                advice where appropriate.
              </p>
            </section>
            <section>
              <h2 className="text-terms-heading mb-24">ASSUMPTION OF FINANCIAL RISK</h2>
              <p className="text-terms-body mb-24">
                To the maximum extent permitted by applicable law, each participant acknowledges and accepts the
                financial and economic risks associated with participation in the Rewards Program and assumes
                responsibility for their own trading, staking, holding and other digital-asset decisions.
              </p>
              <p className="text-terms-body mb-24">
                No GMX Protected Party shall be responsible merely because a reward is worth less than anticipated,
                becomes illiquid or non-transferable, a participant incurs losses exceeding their rewards, an estimated
                reward differs from the amount ultimately received, or participation produces an economic outcome
                different from that anticipated by the participant.
              </p>
              <p className="text-terms-body mb-24">
                Nothing in this Master Financial, Rewards and Economic Disclaimer excludes or limits liability which
                cannot lawfully be excluded or limited under applicable law.
              </p>
            </section>
          </div>
        </article>
      </main>
    </SEO>
  );
}
