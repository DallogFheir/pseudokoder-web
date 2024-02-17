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
          <div className="fs-4">
            <a
              className="link"
              href="https://github.com/DallogFheir/pseudokoder?tab=readme-ov-file#opis-j%C4%99zyka"
              target="_blank"
              rel="noreferrer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                fill="currentColor"
                class="bi bi-github"
                viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
              </svg>
              <span className="ms-1">Opis języka</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
