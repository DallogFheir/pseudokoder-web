class SyntaxError extends Error {
  constructor(message, position) {
    super(
      `Wiersz ${position.line - 1}, kolumna ${position.column + 1}: ${message}`
    );
    this.line = position.line - 1;
    this.column = position.column;
  }
}

class RuntimeError extends Error {
  constructor(message, position) {
    super(
      `Wiersz ${position.line}, kolumna ${position.column + 1}: ${message}`
    );
    this.line = position.line;
    this.column = position.column;
  }
}

class InternalError extends Error {}

export { SyntaxError, RuntimeError, InternalError };
