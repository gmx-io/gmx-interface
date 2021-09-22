import React from 'react'

import { getConstant } from './Constants'

import DashboardV1 from './DashboardV1'
import DashboardV2 from './DashboardV2'

export default function Dashboard() {
  const chainId = 42161 // set chain to Arbitrum
  const isV2 = getConstant(chainId, "v2")
  return (isV2 ? <DashboardV2 /> : <DashboardV1 />)
}
