import "./Output.css";

function Output({ output, error }) {
  let fullMessage;
  if (error !== null) {
    if (typeof error === "object") {
      const line = error.lines[error.line - 1];
      const pointer = " ".repeat(error.column - 1) + "^";

      fullMessage =
        line === undefined
          ? error.message
          : `${line}\n${pointer}\n${error.message}`;
    } else {
      fullMessage = error;
    }
  }

  return (
    <div className="container-output">
      <h2 className="text-center fw-bold">Wyjście</h2>
      <div className="output">
        {output !== "" && <p>{output}</p>}
        {error !== null &&
          fullMessage.split("\n").map((part, idx) => (
            <p className="output-error" key={`error-${idx}`}>
              {part}
            </p>
          ))}
      </div>
    </div>
  );
}

export default Output;
