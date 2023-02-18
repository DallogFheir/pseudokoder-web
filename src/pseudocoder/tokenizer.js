import { SyntaxError } from "./errors.js";

class Tokenizer {
  constructor(code) {
    this.lines = code.split("\n").map((line) => line.replace("\t", "    "));
    this.line = 0;
    this._col = 0;
    this.ifNextLine = false;
    this.ifPreviousNextLine = true;
    this.ifPreviousIndentation = false;
  }

  get col() {
    return this._col;
  }

  set col(value) {
    if (value === -1) {
      this.line--;
      this._col = this.lines[this.line].length;
      this.ifNextLine = false;
    } else if (this.lines[this.line].length <= value) {
      this.line++;
      this._col = 0;
      this.ifNextLine = true;
    } else {
      this._col = value;
      this.ifNextLine = false;
    }
  }

  get currentSlice() {
    return this.lines[this.line].slice(this.col);
  }

  setBack(line, col, newLine = false) {
    this.line = line;
    this.col = col;

    if (newLine) {
      this.ifNextLine = true;
    }
  }

  hasMoreTokens() {
    return (
      this.line !== this.lines.length &&
      !(this.lines.length === 1 && this.lines[0] === "")
    );
  }

  getNextToken() {
    if (!this.hasMoreTokens()) {
      return null;
    }

    const line = this.line;
    const col = this.col;

    // new line
    if (
      this.ifNextLine &&
      this.lines[this.line].trim() !== "" &&
      !this.lines[this.line].startsWith("#")
    ) {
      this.ifNextLine = false;
      this.ifPreviousNextLine = true;

      return {
        type: "NEWLINE",
        position: {
          line: line,
          column: col,
        },
      };
    }

    // empty line
    if (this.lines[this.line] === "") {
      this.col++;

      return this.getNextToken();
    }

    // indentation
    const matchedIndentation = /^    /.exec(this.currentSlice);
    if (
      matchedIndentation !== null &&
      (this.ifPreviousNextLine || this.ifPreviousIndentation)
    ) {
      this.col += matchedIndentation[0].length;
      this.ifPreviousNextLine = false;
      this.ifPreviousIndentation = true;

      return {
        type: "INDENTATION",
        position: {
          line: line,
          column: col,
        },
      };
    }

    this.ifPreviousNextLine = false;
    this.ifPreviousIndentation = false;
    // whitespace or comment
    const matchedWhitespace = /^\s+|^#.*$/.exec(this.currentSlice);
    if (matchedWhitespace !== null) {
      this.col += matchedWhitespace[0].length;

      return this.getNextToken();
    }

    // BRACKET
    const matchedBracket = /^(\[|\])/.exec(this.currentSlice);
    if (matchedBracket !== null) {
      this.col += matchedBracket[0].length;

      return {
        type: "BRACKET",
        value: matchedBracket[0],
        position: {
          line: line,
          column: col,
        },
      };
    }

    // COMMA
    const matchedComma = /^,/.exec(this.currentSlice);
    if (matchedComma !== null) {
      this.col += matchedComma[0].length;

      return {
        type: "COMMA",
        position: {
          line: line,
          column: col,
        },
      };
    }

    // ELLIPSIS
    const matchedEllipsis = /^\.\.\./.exec(this.currentSlice);
    if (matchedEllipsis !== null) {
      this.col += matchedEllipsis[0].length;

      return {
        type: "ELLIPSIS",
        position: {
          line: line,
          column: col,
        },
      };
    }

    // PARENTHESIS
    const matchedParenthesis = /^(\(|\))/.exec(this.currentSlice);
    if (matchedParenthesis !== null) {
      this.col += matchedParenthesis[0].length;

      return {
        type: "PARENTHESIS",
        value: matchedParenthesis[0],
        position: {
          line: line,
          column: col,
        },
      };
    }

    // KEYWORD
    const matchedKeyword =
      /^(<-|=(?!=)|zwróć |zwróć$|(dla|dopóki|jeżeli|to|w przeciwnym razie|wykonuj|wypisz|funkcja)\b)/.exec(
        this.currentSlice
      );
    if (matchedKeyword !== null) {
      this.col += matchedKeyword[0].length;

      return {
        type: "KEYWORD",
        value: matchedKeyword[0].trim(),
        position: {
          line: line,
          column: col,
        },
      };
    }

    // BOOL
    const matchedBool = /^(PRAWDA|FAŁSZ)\b/.exec(this.currentSlice);
    if (matchedBool !== null) {
      this.col += matchedBool[0].length;

      return {
        type: "BOOL",
        value: matchedBool[0],
        position: {
          line: line,
          column: col,
        },
      };
    }

    // STRING
    if (this.currentSlice[0] === '"') {
      let string = '"';
      this.col++;
      while (this.currentSlice[0] !== '"') {
        string += this.currentSlice[0];
        this.col++;

        if (this.ifNextLine) {
          if (!this.hasMoreTokens()) {
            this.col--;
            throw new SyntaxError(
              "Nieoczekiwany koniec wejścia. Oczekiwano zamknięcia napisu.",
              {
                line: this.line,
                column: this.col,
              }
            );
          }

          this.col--;
          throw new SyntaxError(
            "Nieoczekiwany koniec linii. Oczekiwano zamknięcia napisu.",
            {
              line: this.line,
              column: this.col,
            }
          );
        }
      }

      this.col++;
      return {
        type: "STRING",
        value: string + '"',
        position: {
          line: line,
          column: col,
        },
      };
    }

    // OPERATOR
    const matchedOperator =
      /^(==|\+|-|\*|\/|div\b|mod\b|<=|>=|<|>|!=|oraz\b|lub\b|nie\b)/.exec(
        this.currentSlice
      );
    if (matchedOperator !== null) {
      this.col += matchedOperator[0].length;

      return {
        type: "OPERATOR",
        value: matchedOperator[0],
        position: {
          line: line,
          column: col,
        },
      };
    }

    // NUMBER
    const matchedNumber = /^\d+(\.\d+)?\b/.exec(this.currentSlice);
    if (matchedNumber !== null) {
      this.col += matchedNumber[0].length;

      return {
        type: "NUMBER",
        value: matchedNumber[0],
        position: {
          line: line,
          column: col,
        },
      };
    }

    // IDENTIFIER
    const matchedIdentifier = /^[_a-zA-Z][_a-zA-Z0-9]*/.exec(this.currentSlice);
    if (matchedIdentifier !== null) {
      this.col += matchedIdentifier[0].length;

      return {
        type: "IDENTIFIER",
        value: matchedIdentifier[0],
        position: {
          line: line,
          column: col,
        },
      };
    }

    throw new SyntaxError(
      `Nieoczekiwany token: ${this.currentSlice}. Nie używaj polskich znaków w nazwach zmiennych.`,
      {
        line: this.line,
        column: this.col,
      }
    );
  }
}

export default Tokenizer;
