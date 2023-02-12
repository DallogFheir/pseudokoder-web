import Variable from "./Variable";
import "./Variables.css";

function Variables({ variables, setVariables }) {
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
          />
        ))}
        <button
          className="mt-3 btn btn-success"
          type="button"
          onClick={() =>
            setVariables((prevState) => [
              ...prevState,
              { identifier: "", type: "variable", value: "" },
            ])
          }
        >
          Dodaj
        </button>
      </div>
    </div>
  );
}

export default Variables;
