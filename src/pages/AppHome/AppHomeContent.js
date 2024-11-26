import { Trans } from "@lingui/macro";
import "./AppHomeContent.css";
import { HeaderLink } from "components/Header/HeaderLink";
import { BsArrowRight } from "react-icons/bs";

export default function AppHomeContent() {
  return (
    <div className="landing-content">
      <div className="content-title">
        <Trans>Become a Liquidity Provider</Trans>
        <br />
        <span className="content-desc">
          Provide liquidity to T3's trading pools and earn fees from every trade. Join our growing network of liquidity
          providers and earn passive income from the platform's success.
        </span>
        <HeaderLink className="btn text-white orange-cta" to="/earn">
          <Trans>Buy TLP</Trans>
          <BsArrowRight className="arrow" style={{ marginLeft: "1rem" }} color={"white"} />
        </HeaderLink>
      </div>
      <div className="content-title">
        <Trans>Buy TMX Token</Trans>
        <span style={{fontSize: '14px', color: '#FFB547'}}> (Coming Soon)</span>
        <span className="content-desc">
          Invest in T3's growth by holding TMX tokens. Earn platform fees, exclusive rewards, and unlock premium features
          as a T3 Pro member. Be part of our ecosystem's future.
        </span>
        <button className="btn text-white orange-cta" disabled style={{opacity: 0.5, cursor: 'not-allowed'}}>
          <Trans>Buy TMX</Trans>
          <BsArrowRight className="arrow" style={{ marginLeft: "1rem" }} color={"white"} />
        </button>
      </div>
    </div>
  );
}
