import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { FaPlus } from "react-icons/fa";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

function ProfitLossEntries({ entries, updateEntry, addEntry, deleteEntry, symbol }) {
  return entries.map((entryData) => {
    return (
      <div className="profit-loss-input-row" key={entryData.id}>
        <SuggestionInput
          placeholder="Price"
          value={entryData.price}
          setValue={(value) => updateEntry(entryData.id, { price: value })}
          symbol="$"
        />
        <SuggestionInput
          placeholder="Size"
          value={entryData.percentage}
          setValue={(value) => updateEntry(entryData.id, { percentage: value })}
          symbol={symbol}
          suggestionList={SUGGESTION_PERCENTAGE_LIST}
        />
        <div className="profit-loss-action">
          <button
            className="profit-loss-remove"
            onClick={() => deleteEntry(entryData.id)}
            disabled={entries.length === 1}
          >
            <FaPlus color="#E74E5D" className="rotate-45" />
          </button>
          <button className="profit-loss-add" onClick={addEntry}>
            <FaPlus color="#5EC989" />
          </button>
        </div>
      </div>
    );
  });
}

export default ProfitLossEntries;
