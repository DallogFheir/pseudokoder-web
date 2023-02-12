class PseudocoderError extends Error {
  constructor(message, position) {
    super(
      `Wiersz ${position.line + 1}, kolumna ${position.column + 1}: ${message}`
    );
    this.line = position.line + 1;
    this.column = position.column;
  }
}

class SyntaxError extends PseudocoderError {}

class RuntimeError extends PseudocoderError {}

class InternalError extends Error {}

export { SyntaxError, RuntimeError, InternalError };
