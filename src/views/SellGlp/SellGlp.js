import React from 'react'

import GlpSwap from '../../components/Glp/GlpSwap'

export default function SellGlp(props) {
  return (<GlpSwap
    {...props}
    isBuying={false}
  />)
}
