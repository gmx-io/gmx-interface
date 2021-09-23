import React from 'react'

import GlpSwap from './components/Glp/GlpSwap'

export default function BuyGlp(props) {
  return (<GlpSwap
    {...props}
    isBuying={true}
  />)
}
