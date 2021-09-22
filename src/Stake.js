import React from 'react'

import { getConstant } from './Constants'

import StakeV1 from './StakeV1'
import StakeV2 from './StakeV2'

export default function Stake() {
  const chainId = 42161 // set chain to Arbitrum
  const isV2 = getConstant(chainId, "v2")
  return (isV2 ? <StakeV2 /> : <StakeV1 />)
}
