import React from 'react'
import { Link } from 'react-router-dom'

import GlpSwap from '../../components/Glp/GlpSwap'
import statsBigIcon from '../../img/ic_stats_big.svg'
import Footer from "../../Footer"

export default function SellGlp(props) {
  return (
    <div className="Page page-layout">
      <div className="section-title-block">
        <div className="section-title-icon">
          <img src={statsBigIcon} alt="statsBigIcon" />
        </div>
        <div className="section-title-content">
          <div className="section-title-content__title">
            Buy or redeem GLP
          </div>
          <div className="section-title-content__description">
            Purchase GLP tokens to earn AVAX fees from swaps and leverages trading. Note that there is a minimum holding time of 15 minutes after a purchase. View <Link to="/earn">staking</Link> page.
          </div>
        </div>
      </div>
      <GlpSwap
        {...props}
        isBuying={false}
      />
      <Footer />
    </div>
  )
}
