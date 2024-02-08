import Variable from "./Variable";
import "./Variables.css";

function Variables({ variables, setVariables, disabled }) {
  return (
    <div className="container-variables">
      <h2 className="fw-bold">Dane wejściowe:</h2>
      <div className="variables">
        {variables.map((variable, idx) => (
          <Variable
            key={`variable-${variable.identifier}`}
            variable={variable}
            variables={variables}
            setVariables={setVariables}
            idx={idx}
            disabled={disabled}
          />
        ))}
        <button
          className="my-3 btn btn-success"
          type="button"
          disabled={disabled}
          onClick={() =>
            setVariables((prevState) => [
              ...prevState,
              { identifier: "", type: "variable", value: "" },
            ])
          }>
          Dodaj
        </button>
      </div>
    </div>
  );
}

export default Variables;
