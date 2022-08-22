import { useWeb3React } from "@web3-react/core"
import { useParams } from "react-router-dom"
import { useTeam } from "../../Api/competition"
import Loader from "../../components/Common/Loader"
import SEO from "../../components/Common/SEO"

export default function Team()
{
  const { chainId, account, library } = useWeb3React()
  const params = useParams()
  const team = useTeam(chainId, library, account)

  return (
    <SEO>
      <div className="default-container page-layout RegisterTeam">
        {team.loading && <Loader/>}
        {team.loading || (
          <div className="section-title-block">
            <div className="section-title-icon"></div>
            <div className="section-title-content">
              <div className="Page-title">{team.data.name}</div>
            </div>
          </div>
        )}
      </div>
    </SEO>
  )
}
