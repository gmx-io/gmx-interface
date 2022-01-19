import React, {useEffect, useState} from 'react'
import { Link, useHistory } from 'react-router-dom'

import GlpSwap from '../../components/Glp/GlpSwap'
import buyGLPIcon from '../../img/ic_buy_glp.svg'
import Footer from "../../Footer"
import "./BuyGlp.css"

export default function BuyGlp(props) {
  const history = useHistory()
  const [isBuying, setIsBuying] = useState(true)
  useEffect(() => {
    const hash = history.location.hash.replace('#', '')
    const buying = hash === 'redeem' ? false : true
    setIsBuying(buying)
  }, [history.location.hash])

  return (
    <div className="default-container buy-glp-content page-layout">
      <div className="section-title-block">
        <div className="section-title-icon">
          <img src={buyGLPIcon} alt="buyGLPIcon" />
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
        isBuying={isBuying}
        setIsBuying={setIsBuying}
      />
      <Footer />
    </div>
    )
}
