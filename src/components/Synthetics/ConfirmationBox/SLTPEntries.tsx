import "./SLTPEntries.scss";
import NumberInput from "components/NumberInput/NumberInput";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { FaPlus } from "react-icons/fa";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

function SLTPEntries({ entries, updateEntry, addEntry, deleteEntry }) {
  return (
    <div className="SLTPEntries-wrapper">
      {entries.map((entryData) => {
        return (
          <div className="SLTPEntry-row" key={entryData.id}>
            <div className="SLTP-price">
              <NumberInput
                value={entryData.price}
                onValueChange={(e) => updateEntry(entryData.id, { price: e.target.value })}
                placeholder="Price"
                className="price-input"
              />
              <span className="price-symbol">$</span>
            </div>
            <PercentageInput
              defaultValue={entryData.percentage}
              onChange={(value) => updateEntry(entryData.id, { percentage: value })}
              suggestions={SUGGESTION_PERCENTAGE_LIST}
            />
            <div className="SLTP-actions">
              <button
                className="action-remove"
                onClick={() => deleteEntry(entryData.id)}
                disabled={entries.length === 1}
              >
                <FaPlus color="#E74E5D" className="rotate-45" />
              </button>
              <button className="action-add" onClick={addEntry}>
                <FaPlus color="#5EC989" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SLTPEntries;
