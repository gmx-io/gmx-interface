import { getChainIcon } from "../../lib/legacy";

export default function TeamPositions({ chainId, positions }) {
  return (
    <>
      <div className="Tab-title-section">
        <div className="Page-title">
          Positions <img alt="Chain Icon" src={getChainIcon(chainId)} />
        </div>
        <div className="Page-description">Platform and GLP index tokens.</div>
      </div>
      <table className="Exchange-list Orders App-box large">
        <tbody>
          <tr className="Exchange-list-header">
            <th>Type</th>
            <th>Order</th>
            <th>Price</th>
            <th>Mark Price</th>
          </tr>
          {positions.length === 0 ? (
            <tr>
              <td colSpan={4}>No open positions</td>
            </tr>
          ) : (
            ""
          )}
        </tbody>
      </table>
      <table className="Exchange-list small">
        <tbody>
          {positions.length === 0 ? (
            <tr>
              <td className="Exchange-empty-positions-list-note App-card">No open positions</td>
            </tr>
          ) : (
            ""
          )}
        </tbody>
      </table>
    </>
  )
}
