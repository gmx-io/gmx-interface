import React from 'react'

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
            Buy GMX or GLP
          </div>
          <div className="section-title-content__description">
            Total Stats start from 01 Sep 2021. For detailed stats: <a href="https://stats.gmx.io/" target="_blank" rel="noopener noreferrer">https://stats.gmx.io</a>.
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
