import { useState } from "react";
import useLocalStorage from "./hooks/useLocalStorage";
import CodeEditor from "./components/CodeEditor";
import Variables from "./components/Variables";
import Output from "./components/Output";
import Interpreter from "./pseudocoder/interpreter";
import { SyntaxError, RuntimeError } from "./pseudocoder/errors";
import "./App.css";

function App() {
  const [indexingFrom0, setIndexingFrom0] = useLocalStorage(
    "indexingFrom0",
    false
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [code, setCode] = useLocalStorage(
    "code",
    `# sortowanie bąbelkowe
dla i = 1, 2, ..., n - 2 wykonuj
     dla j = 1, 2, ..., n - i wykonuj
        jeżeli T[j] > T[j + 1] to
            temp <- T[j]
            T[j] <- T[j + 1]
            T[j + 1] <- temp
wypisz T`
  );
  const [variables, setVariables] = useLocalStorage("variables", [
    { identifier: "n", type: "variable", value: "10" },
    { identifier: "T", type: "array", value: "1, 10, 4, 1, 2, 3, 1, 2, 11, 5" },
  ]);

  const parseVariable = (variable) => {
    const possibleNumber = parseInt(variable);

    if (!Number.isNaN(possibleNumber)) {
      return possibleNumber;
    }

    if (variable === "PRAWDA" || variable === "FAŁSZ") {
      return variable === "PRAWDA";
    }

    return variable.slice(1, -1);
  };

  const prepareVariables = (variables) => {
    const result = {};

    for (const variable of variables) {
      if (variable.type === "array") {
        const array = variable.value.split(",").filter((el) => el !== "");
        result[variable.identifier] = array.map((el) => parseVariable(el));
        continue;
      }

      result[variable.identifier] = parseVariable(variable.value);
    }

    return result;
  };

  const execute = () => {
    const interpreter = new Interpreter();

    try {
      const output = interpreter.execute(
        code,
        prepareVariables(variables),
        indexingFrom0 ? 0 : 1,
        false
      );
      setOutput(
        output
          .map((el) => {
            if (Array.isArray(el)) {
              return `[${el.join(", ")}]`;
            }

            return el;
          })
          .join("\n")
      );
      setError(null);
    } catch (err) {
      console.error(err);

      if (err instanceof SyntaxError || err instanceof RuntimeError) {
        const lines = code
          .split("\n")
          .map((line) => line.replace("\t", "    "));
        const output =
          err.output &&
          err.output
            .map((el) => {
              if (Array.isArray(el)) {
                return `[${el.join(", ")}]`;
              }

              return el;
            })
            .join("\n");

        setOutput(output || "");
        setError({
          lines,
          line: err.line,
          column: err.column,
          message: err.message,
        });
      } else if (err.message === "too much recursion") {
        setOutput("");
        setError("Za dużo rekurencji!");
      } else {
        setOutput("");
        setError("Ups, wystąpił nieoczekiwany błąd wewnętrzny.");
      }
    }
  };

  return (
    <div className="container-main">
      <div className="container-side">
        <CodeEditor code={code} setCode={setCode} />
        <Output output={output} error={error} />
      </div>
      <div className="container-side">
        <Variables variables={variables} setVariables={setVariables} />
        <div className="mt-5 container-misc">
          <label className="form-label fw-bold" htmlFor="indexing-checkbox">
            Indeksowanie tablic od 0
          </label>
          <input
            className="ms-3 form-check-input"
            id="indexing-checkbox"
            type="checkbox"
            defaultChecked={indexingFrom0}
            onChange={() => setIndexingFrom0((prevState) => !prevState)}
          />
        </div>
        <div className="container-misc">
          <button
            className="mt-4 btn btn-primary btn-execute fw-bold"
            type="button"
            onClick={execute}
          >
            Wykonaj
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
