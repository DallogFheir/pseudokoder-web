import "./Output.css";

function Output({ output, error }) {
  let fullMessage;
  if (error !== null) {
    const line = error.lines[error.line - 1];
    const pointer = " ".repeat(error.column) + "^";

    fullMessage =
      line === undefined
        ? error.message
        : `${line}\n${pointer}\n${error.message}`;
  }

  return (
    <div className="container-output">
      <h2 className="fw-bold">Wyjście</h2>
      <div className="output">
        <p>{output}</p>
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
