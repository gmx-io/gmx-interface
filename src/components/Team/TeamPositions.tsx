import { useChainId } from "lib/chains";
import { useTeamPositions } from "domain/leaderboard/graph";
import { Position, Team } from "domain/leaderboard/types";

type Props = {
  team: Team;
};

export default function TeamPositions({ team }: Props) {
  const { chainId } = useChainId();
  const { data: positions, loading } = useTeamPositions(chainId, team.leaderAddress);

  const Row = ({ position }: { position: Position }) => {
    return (
      <tr>
        <td>0x000</td>
      </tr>
    );
  };

  return (
    <>
      <div className="Tab-title-section">
        <div className="Page-title">Positions</div>
      </div>
      <table className="Exchange-list Orders App-box large">
        <tbody>
          <tr className="Exchange-list-header">
            <th>Account</th>
            <th>Type</th>
            <th>Order</th>
            <th>Price</th>
            <th>Mark Price</th>
          </tr>
          {loading ? (
            <tr>
              <td colSpan={5}>Loading positions...</td>
            </tr>
          ) : (
            <>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={5}>No open positions</td>
                </tr>
              ) : (
                positions.map((position) => <Row position={position} />)
              )}
            </>
          )}
        </tbody>
      </table>
    </>
  );
}
