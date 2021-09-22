import React from 'react'

import GlpSwap from './components/Glp/GlpSwap'

export default function SellGlp(props) {
  const { savedSlippageAmount } = props
  return (<GlpSwap
    savedSlippageAmount={savedSlippageAmount}
    isBuying={false}
  />)
}
