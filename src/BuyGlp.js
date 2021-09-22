import React from 'react'

import GlpSwap from './components/Glp/GlpSwap'

export default function BuyGlp(props) {
  const { savedSlippageAmount } = props
  return (<GlpSwap
    savedSlippageAmount={savedSlippageAmount}
    isBuying={true}
  />)
}
