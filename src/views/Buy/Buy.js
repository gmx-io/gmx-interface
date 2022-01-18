import React, { useEffect } from 'react'
import Footer from "../../Footer"
import './Buy.css';
import TokenCard from '../../components/TokenCard/TokenCard'
import statsBigIcon from '../../img/ic_stats_big.svg'

export default function BuyGMXGLP(props) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="BuyGMXGLP new-update page-layout">
      <div className="BuyGMXGLP-container default-container">
        <div className="section-title-block">
          <div className="section-title-icon">
            <img src={statsBigIcon} alt="statsBigIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Buy GMX or GLP
            </div>
          </div>
        </div>
        <TokenCard />
      </div>
      <Footer />
    </div>
  )
}
