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
      <div className="row">
        <label
          className="form-label fw-bold col-form-label col-6"
          htmlFor={`variable-name-${idx}`}
        >
          Nazwa zmiennej:
        </label>
        <div className="col-6">
          <input
            className="form-control variable-form-control"
            id={`variable-name-${idx}`}
            type="text"
            value={variableName}
            onInput={(e) => setVariableName(e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <label
          className="variable-label form-label fw-bold col-form-label col-6"
          htmlFor={`variable-type-${idx}`}
        >
          Typ:
        </label>
        <div className="col-6">
          <select
            className="form-select variable-form-control"
            id={`variable-type-${idx}`}
            value={variableType}
            onChange={(e) => setVariableType(e.target.value)}
          >
            <option value="variable">zwykła zmienna</option>
            <option value="array">tablica</option>
          </select>
        </div>
      </div>
      <div className="row">
        <label
          className="variable-label form-label fw-bold col-form-label col-6"
          htmlFor={`variable-value-${idx}`}
        >
          Wartość:
        </label>
        <div className="col-6">
          <input
            className="form-control variable-form-control"
            id={`variable-value-${idx}`}
            type="text"
            value={variableValue}
            onInput={(e) => setVariableValue(e.target.value)}
          />
        </div>
      </div>
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
