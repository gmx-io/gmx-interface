import React from "react";
import Footer from "components/Footer/Footer";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import "./ReferralTerms.css";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { t } from "@lingui/macro";

export default function ReferralTerms() {
  return (
    <SEO title={getPageTitle(t`Referral Terms`)}>
      <div className="default-container Page page-layout">
        <div>
          <div className="Page-title-section center">
            <div className="Page-title">GMX Referral Program</div>
            <div className="Page-subtitle">Terms and Conditions</div>
            <div className="Page-description">Last modified: August 1st, 2022</div>
          </div>
          <div className="content">
            <div className="section">
              <p className="body-text">
                Welcome to GMX.io ("we," "us," or "our"), the informational resource for GMX Protocol, as defined below.
              </p>
              <p className="body-text">
                GMX.io provides information and resources about the fundamentals of the decentralized non-custodial
                protocol called the GMX Protocol (the "GMX Protocol," "Protocol," or "GMX DApp"). GMX.io is not an
                available access point to the GMX Protocol.
              </p>
              <p className="body-text">
                These Terms and Conditions and any other documents incorporated herein by reference (collectively, these
                "Terms") to you or the company or other legal entity you represent ("you," "your," "the Referrer," "the
                Affiliate"), explains the terms and conditions by which you may use the GMX Referral Program ("Referral
                Program") as defined below.
              </p>
              <p className="body-text">
                Please do not use the Referral Program if you disagree with any of these Terms.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">1. USE OF THE REFERRAL PROGRAM</h3>
              <p className="body-text">All this content is for informational purposes only.</p>
              <p className="body-text">
                The Referral Program allows you to advertise the GMX DApp, thereby driving traffic to it, whereby you
                may earn a portion of the fees generated ("Rebates") if a person that is not you ("Trader," "Referred
                User") trades in the GMX DApp after being referred to it from a hyperlink ("Link") or manually input
                code ("Referral Code"). The Trader will benefit from a fee discount ("Discount") associated with the
                Referrer's tier.
              </p>
              <p className="body-text">
                After being referred to the GMX DApp from a Link, the Trader's browser will save your Referral Code,
                which will be assigned to the Trader on his first trade.
              </p>
              <p className="body-text">
                A Trader can also manually enter your Referral Code in the Traders section and change it at any time.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">2. OBLIGATIONS</h3>
              <p className="body-text">
                2.1 As an Affiliate, GMX DApp provides you with the Links and Referral Codes necessary to promote the
                GMX Protocol. You acknowledge and agree it is your sole responsibility to indicate your correct Referral
                Code. You may promote the GMX Protocol offers in any manner you choose unless it misleads someone about
                the GMX Protocol.
              </p>
              <p className="body-text">
                2.2 GMX.io is not responsible for (i) lost sales or lost opportunity to earn Rebates due to any cause,
                such as technical difficulties or over-capacity, including system overload in the Arbitrum or Avalanche
                blockchains; (ii) tracking Rebates, Discounts, or any other data, as this is handled by independent,
                smart contracts.
              </p>
              <p className="body-text">
                2.3 You will be excluded from the Referral Program, following the directives of the GMX tokenholders:
                (i) if you use any language libelous, defamatory, profane, obscene, pornographic, sexually explicit,
                indecent, lewd, vulgar, suggestive, harassing, stalking, hateful, threatening, offensive,
                discriminatory, bigoted, abusive, inflammatory, fraudulent, deceptive, or otherwise objectionable or
                likely or intended to incite, threaten, facilitate, promote, or encourage hate, racial intolerance, or
                violent acts against others; (ii) if you try any form of gaming through self-referrals.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">3. REBATES AND DISCOUNTS</h3>
              <p className="body-text">
                Referrers will receive rebates based on a sliding percentage of fees paid by Referred Users. Rebates
                will never be retroactive.
              </p>
              <p className="body-text">
                GMX.io is under no obligation for Rebates or Discounts to any Referrer or Trader. Rebates and Discounts
                are handled following the directives of the GMX tokenholders.
              </p>
              <p className="body-text">
                The Rebates and Discounts percentages for the default tier Tier 1, and instructions to upgrade to Tier 2
                and Tier 3, are contained in{" "}
                <ExternalLink href="https://docs.gmx.io/docs/referrals">
                  https://docs.gmx.io/docs/referrals.
                </ExternalLink>
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">4. LIMITATION OF LIABILITY</h3>
              <p className="body-text">
                Under no circumstances shall GMX.io be liable for any direct, indirect, incidental, punitive, special,
                consequential damages, or similar damages or liabilities whatsoever for any reason whatsoever related to
                these Terms, your use or inability to use our web site(s), or the materials and content of the web
                site(s) or any other web sites linked to such web site(s) or your provision of any personally
                identifiable information to a backend service provider or any third party. This limitation applies
                regardless of whether the alleged liability is based on contract, tort, warranty, negligence, strict
                liability, or any other basis, even if we have been advised of the possibility of such damages or such
                damages were reasonably foreseeable.
              </p>
              <p className="body-text">
                In no event shall GMX.io's aggregate liability arising out of or in connection with the Site exceed five
                hundred Singapore Dollars (500 SGD).
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">5. INDEMNIFICATION</h3>
              <p className="body-text">
                You will defend, indemnify, and hold harmless GMX.io, its affiliates, members, member, managers,
                employees, attorneys, representatives, suppliers, and contractors from any claim, demand, lawsuit,
                action, proceeding, investigation, liability, damage, loss, cost or expense, including without
                limitation reasonable attorneys' fees, arising out of or relating to arising under these Terms, the
                service(s) provided by GMX.io, or your use of the service(s) provided by GMX.io, including, without
                limitation, an infringement by you, or by anyone else using such service(s) we provide to you, of any
                intellectual property or other proprietary rights of any person or entity, or from the violation of any
                of our operating rules or policies relating to the service(s) provided. When we may be involved in a
                suit involving a third party and which is related to our service(s) to you under these Terms, we may
                seek written assurances from you in which you promise to defend, indemnify and hold us harmless from the
                costs and liabilities described in this paragraph. Such written assurances may include, in our sole
                discretion, the posting of a performance bond(s) or other guarantees reasonably calculated to guarantee
                payment. We may consider your failure to provide such assurances a breach of these Terms by you. The
                terms of this paragraph will survive any termination or cancellation of the Terms.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">6. MODIFICATION, SUSPENSION, AND TERMINATION</h3>
              <p className="body-text">
                The Referral Program runs independently from GMX.io, which the token holders of GMX determine. Due to
                this, from time to time and with or without prior notice to you, the Referral Program could be subject
                to modifications, suspensions, or disabilities, in whole or in part, for any reason whatsoever.
              </p>
              <p className="body-text">
                GMX.io will not be liable for any losses suffered by you resulting from any modification to the Referral
                Program or from any modification, suspension, or termination, for any reason, of your access to all or
                any portion of the Interface or the Protocol.
              </p>
              <p className="body-text">
                GMX.io may revise these Terms from time to time. We will notify you by updating the date at the top of
                the Terms and maintaining a current version. The most current version of the Terms will always be at
                https://gmx.io/referral-terms. All modifications will be effective when they are posted. By using the
                Referral Program after those revisions become effective, you agree to be bound by the revised Terms.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">7. GOVERNING LAW</h3>
              <p className="body-text">
                The interpretation and enforcement of these Terms, and any dispute related to these Terms, the Site, or
                the Interface, will be governed by and construed and enforced under the laws of the Bahamas, as
                applicable.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">8. GENERAL</h3>
              <p className="body-text">
                8.1 These Terms, including other policies or agreements incorporated herein, constitute the entire and
                only agreement between you and GMX.io concerning the subject matter of these Terms and supersede all
                prior or contemporaneous agreements, representations, warranties, and understandings, written or oral,
                concerning the subject matter of these Terms. Any failure by us to exercise or enforce any right or
                provision of the Terms shall not constitute a waiver of such right or provision.
              </p>
              <p className="body-text">
                8.2 You must legally be able to enter into the Terms. Using the Referral Program, you represent and
                warrant that you meet the eligibility requirement. If you do not meet the requirement, you must not
                access the Referral Program.
              </p>
              <p className="body-text">
                8.3 Nothing contained herein will be construed to create the relationship of principal and agent,
                employer and employee, partners or joint venturers. Each party shall ensure that the foregoing persons
                shall not represent to the contrary, either expressly, implicitly, by appearance, or otherwise.
              </p>
              <p className="body-text">
                8.4 If any provision of these Terms shall be unenforceable or invalid under any applicable law or be
                held by any applicable court decision, such unenforceability or invalidity shall not render these Terms
                unenforceable or invalid as a whole. GMX.io will amend or replace such provision with one that is valid
                and enforceable and which achieves, to the extent possible, our original objectives and intent as
                reflected in the original provision.
              </p>
              <p className="body-text">
                8.5 You may not assign or transfer any right to use the Referral Program, or any of your rights or
                obligations under these Terms, without our express prior written consent, including by operation of law
                or in connection with any change of control. GMX.io may assign or transfer any or all of our rights or
                obligations under these Terms, in whole or part, without notice or obtaining your consent or approval.
              </p>
              <p className="body-text">
                8.6 GMX.io will have no responsibility or liability for any failure or delay in performance of the Site,
                or any loss or damage that you may incur, due to any circumstance or event beyond our control, including
                without limitation any flood, extraordinary weather conditions, earthquake, or other act of God, fire,
                war, insurrection, riot, labor dispute, accident, any law, order regulation, direction, action or
                request of the government, communications, power failure, or equipment or software malfunction.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">9. CONTACT INFORMATION</h3>
              <p className="body-text">
                If you have any questions about these Terms, the Site, or the Interface, please get in touch with GMX.io
                on any of our official channels.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
