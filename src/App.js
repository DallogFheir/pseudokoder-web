import { useState, useEffect } from "react";
import useLocalStorage from "./hooks/useLocalStorage";
import CodeEditor from "./components/CodeEditor";
import Variables from "./components/Variables";
import Output from "./components/Output";
import "./App.css";

const WORKER_PATH = `${process.env.PUBLIC_URL}/worker.js`;

function App() {
  const [worker, setWorker] = useState(() => new Worker(WORKER_PATH));
  const [executingTimeouts, setExecutingTimeouts] = useState(null);

  const [indexingFrom0Arrays, setIndexingFrom0Arrays] = useLocalStorage(
    "indexingFrom0Arrays",
    false
  );
  const [indexingFrom0Strings, setIndexingFrom0Strings] = useLocalStorage(
    "indexingFrom0Strings",
    false
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [code, setCode] = useLocalStorage(
    "code",
    `# sortowanie bąbelkowe
dla i = 1, 2, ..., n - 1 wykonuj
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

  useEffect(() => {
    const msgListener = (msg) => {
      const { output, error } = msg.data;
      setOutput(output);
      setError(error);
      executingTimeouts?.forEach((timeout) => clearTimeout(timeout));
      setExecutingTimeouts(null);
    };

    worker.addEventListener("message", msgListener);

    return () => worker.removeEventListener("message", msgListener);
  }, [worker, executingTimeouts]);

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
    worker.postMessage({
      code,
      startingBindings: prepareVariables(variables),
      firstIndexStrings: indexingFrom0Strings ? 0 : 1,
      firstIndexArrays: indexingFrom0Arrays ? 0 : 1,
    });

    setExecutingTimeouts([
      setTimeout(() => {
        setOutput("Wykonywanie");
      }, 1000),
      setTimeout(() => {
        setOutput("Wykonywanie.");
      }, 2000),
      setTimeout(() => {
        setOutput("Wykonywanie..");
      }, 3000),
      setTimeout(() => {
        setOutput("Wykonywanie...");
      }, 4000),
      setTimeout(() => {
        worker.terminate();
        setWorker(new Worker(WORKER_PATH));
        setOutput("");
        setError(
          "Wydaje się, że Twój kod wykonuje się zbyt długo. Sprawdź go pod kątem nieskończonych pętli."
        );
        setExecutingTimeouts(null);
      }, 5000),
    ]);
  };

  return (
    <div className="container-main">
      <div className="container-side container-side-left">
        <CodeEditor code={code} setCode={setCode} />
        <Output output={output} error={error} />
      </div>
      <div className="container-side container-side-right">
        <Variables
          variables={variables}
          setVariables={setVariables}
          disabled={executingTimeouts !== null}
        />
        <div className="mt-5 container-misc">
          <label className="form-label fw-bold" htmlFor="indexing-checkbox">
            Indeksowanie tablic od 0
          </label>
          <input
            className="ms-3 form-check-input"
            id="indexing-checkbox"
            type="checkbox"
            defaultChecked={indexingFrom0Arrays}
            disabled={executingTimeouts !== null}
            onChange={() => setIndexingFrom0Arrays((prevState) => !prevState)}
          />
        </div>
        <div className="mt-5 container-misc">
          <label className="form-label fw-bold" htmlFor="indexing-checkbox">
            Indeksowanie napisów od 0
          </label>
          <input
            className="ms-3 form-check-input"
            id="indexing-checkbox"
            type="checkbox"
            defaultChecked={indexingFrom0Strings}
            disabled={executingTimeouts !== null}
            onChange={() => setIndexingFrom0Strings((prevState) => !prevState)}
          />
        </div>
        <div className="container-misc">
          <button
            className="my-5 btn btn-primary btn-execute fw-bold"
            type="button"
            onClick={execute}
            disabled={executingTimeouts !== null}>
            Wykonaj
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
