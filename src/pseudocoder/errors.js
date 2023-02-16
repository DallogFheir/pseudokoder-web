class PseudocoderError extends Error {
  constructor(message, position) {
    super(
      `Wiersz ${position.line + 1}, kolumna ${position.column + 1}: ${message}`
    );
    this.line = position.line + 1;
    this.column = position.column + 1;
  }
}

class SyntaxError extends PseudocoderError {}

class RuntimeError extends PseudocoderError {
  constructor(message, position, output) {
    super(message, position);
    this.output = output;
  }
}

class BuiltinFunctionError extends Error {}

class InternalError extends Error {}

export { SyntaxError, RuntimeError, BuiltinFunctionError, InternalError };
