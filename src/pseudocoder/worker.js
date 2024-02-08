/* eslint-disable no-restricted-globals */
import { RuntimeError } from "./errors";
import Interpreter from "./interpreter";

self.addEventListener("message", (msg) => {
  const { code, startingBindings, firstIndexStrings, firstIndexArrays } =
    msg.data;

  const interpreter = new Interpreter();

  try {
    const output = interpreter.execute(
      code,
      startingBindings,
      false,
      firstIndexStrings,
      firstIndexArrays
    );

    const processedOutput = output
      .map((el) => {
        if (Array.isArray(el)) {
          return `[${el
            .map((subel) => {
              if (typeof subel === "boolean") {
                subel = subel ? "PRAWDA" : "FAŁSZ";
              }

              return subel;
            })
            .join(", ")}]`;
        }

        return el;
      })
      .join("\n");

    self.postMessage({ output: processedOutput, error: null });
  } catch (err) {
    let finalOutput = null;
    let error = null;
    if (err instanceof SyntaxError || err instanceof RuntimeError) {
      const lines = code.split("\n").map((line) => line.replace("\t", "    "));
      const output =
        err.output &&
        err.output
          .map((el) => {
            if (Array.isArray(el)) {
              return `[${el
                .map((subel) => {
                  if (typeof subel === "boolean") {
                    subel = subel ? "PRAWDA" : "FAŁSZ";
                  }

                  return subel;
                })
                .join(", ")}]`;
            }

            return el;
          })
          .join("\n");

      finalOutput = output || "";
      error = {
        lines,
        line: err.line,
        column: err.column,
        message: err.message,
      };
    } else {
      finalOutput = "";
      error = "Ups, wystąpił nieoczekiwany błąd wewnętrzny.";
    }

    self.postMessage({ output: finalOutput, error });
  }
});
