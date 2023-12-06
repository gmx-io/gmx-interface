import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { uniqueId } from "lodash";
import { FaPlus } from "react-icons/fa";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

const updateEntry = (entries, id, key, value) => {
  return entries.map((entry) => (entry.id === id ? { ...entry, [key]: value } : entry));
};

function ProfitLossEntry({ entries, setEntries, symbol }) {
  return entries.map((entryData) => {
    return (
      <div className="profit-loss-input-row" key={entryData.id}>
        <SuggestionInput
          placeholder="Price"
          value={entryData.price}
          setValue={(value) => setEntries(updateEntry(entries, entryData.id, "price", value))}
          symbol="$"
        />
        <SuggestionInput
          placeholder="Size"
          value={entryData.amount}
          setValue={(value) => setEntries(updateEntry(entries, entryData.id, "amount", value))}
          symbol={symbol}
          suggestionList={SUGGESTION_PERCENTAGE_LIST}
        />
        <div className="profit-loss-action">
          <button
            className="profit-loss-remove"
            onClick={() => {
              setEntries((prevEntries) =>
                prevEntries.length > 1 ? prevEntries.filter((entry) => entry.id !== entryData.id) : prevEntries
              );
            }}
            disabled={entries.length === 1}
          >
            <FaPlus color="#E74E5D" className="rotate-45" />
          </button>
          <button
            className="profit-loss-add"
            onClick={() => {
              setEntries((prev) => prev.concat({ id: uniqueId(), price: "", amount: "" }));
            }}
          >
            <FaPlus color="#5EC989" />
          </button>
        </div>
      </div>
    );
  });
}

export default ProfitLossEntry;
