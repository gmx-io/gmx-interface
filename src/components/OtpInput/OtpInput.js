import React, { useState, useRef, useEffect } from "react";
import "./OtpInput.css";

function OtpInput({ onOtpEntered }) {
  const [inputValues, setInputValues] = useState(Array(4).fill(""));
  const inputRefs = useRef([]);

  const handleInputChange = (event, index) => {
    const newValues = [...inputValues];
    newValues[index] = event.target.value;
    setInputValues(newValues);

    if (event.target.value && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  useEffect(() => {
    if (inputValues.join("").length === 4) {
      onOtpEntered(inputValues.join(""));
    }
  }, [inputValues, onOtpEntered]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, inputValues.length);
    inputRefs.current[0].focus();
  }, [inputValues.length]);

  return (
    <div className="input-container">
      {inputValues.map((value, index) => (
        <input
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          type="number"
          value={value}
          className="input-box"
          onChange={(e) => handleInputChange(e, index)}
          maxLength={1}
        />
      ))}
    </div>
  );
}

export default OtpInput;
