import { useState, useEffect, useRef } from "react";
import "./Variable.css";

function Variable({ variable, variables, setVariables, idx }) {
  const previousVariableName = useRef(variable.identifier);
  const [variableName, setVariableName] = useState(variable.identifier);
  const [variableType, setVariableType] = useState(variable.type);
  const [variableValue, setVariableValue] = useState(variable.value);

  useEffect(() => {
    const newVariables = variables.map((variable) => ({ ...variable }));

    for (let i = 0; i < newVariables.length; i++) {
      if (newVariables[i].identifier === previousVariableName.current) {
        newVariables[i] = {
          identifier: variableName,
          type: variableType,
          value: variableValue,
        };

        previousVariableName.current = variableName;
        setVariables(newVariables);

        break;
      }
    }
  }, [variableName, variableType, variableValue]);

  return (
    <div className="variable">
      <label
        className="variable-label form-label fw-bold"
        htmlFor={`variable-name-${idx}`}
      >
        Nazwa zmiennej:
      </label>
      <input
        className="form-control"
        id={`variable-name-${idx}`}
        type="text"
        value={variableName}
        onInput={(e) => setVariableName(e.target.value)}
      />
      <label
        className="variable-label form-label fw-bold"
        htmlFor={`variable-type-${idx}`}
      >
        Typ:
      </label>
      <select
        className="form-control"
        id={`variable-type-${idx}`}
        value={variableType}
        onChange={(e) => setVariableType(e.target.value)}
      >
        <option value="variable">zwykła zmienna</option>
        <option value="array">tablica</option>
      </select>
      <label
        className="variable-label form-label fw-bold"
        htmlFor={`variable-value-${idx}`}
      >
        Wartość:
      </label>
      <input
        className="form-control"
        id={`variable-value-${idx}`}
        type="text"
        value={variableValue}
        onInput={(e) => setVariableValue(e.target.value)}
      />
      <button
        className="mt-3 btn btn-danger"
        type="button"
        onClick={() =>
          setVariables((prevState) => {
            return prevState.filter(
              (variable) => variable.identifier !== variableName
            );
          })
        }
      >
        Usuń
      </button>
    </div>
  );
}

export default Variable;
