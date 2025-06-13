/* eslint-disable no-restricted-globals */
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

class Parser {
  constructor() {
    this.ifNextLine = false;
    this.indentationLevel = 0;
    this.definingFunction = 0;
    this.consumingCall = 0;
    this.tokenTrans = {
      INDENTATION: "wcięcie",
      IDENTIFIER: "zmienna",
      PARENTHESIS: "nawias okrągły",
      BRACKET: "nawias kwadratowy",
      COMMA: "przecinek",
      KEYWORD: "słowo kluczowe",
      NUMBER: "liczba",
      STRING: "napis",
      BOOL: "boolean",
      OPERATOR: "operator",
      ELLIPSIS: "trzy kropki",
      NEWLINE: "nowa linia",
    };
  }

  parse(code) {
    this.tokenizer = new Tokenizer(code);
    this.code = code;

    this.lookahead = this.tokenizer.getNextToken();

    return this.programProduction();
  }

  consume(type, expected = null) {
    if (this.lookahead === null) {
      throw new SyntaxError(
        `Nieoczekiwany koniec wejścia, oczekiwano: ${
          expected ?? this.tokenTrans[type]
        }.`,
        {
          line: this.tokenizer.line,
          column: this.tokenizer.col,
        }
      );
    }

    if (this.lookahead.type !== type) {
      throw new SyntaxError(
        `Nieoczekiwany token: ${
          this.tokenTrans[this.lookahead.type]
        }, oczekiwano: ${expected ?? this.tokenTrans[type]}.`,
        this.lookahead.position
      );
    }

    const token = this.lookahead;
    this.ifNextLine = this.tokenizer.ifNextLine;
    this.lookahead = this.tokenizer.getNextToken();

    return token;
  }

  programProduction() {
    return {
      type: "Program",
      body: this.statementListProduction(),
    };
  }

  statementListProduction() {
    const firstStatement = this.statementProduction();
    const statements = [];

    if (firstStatement === null) {
      return {
        type: "StatementList",
        statements,
      };
    }

    if (this.tokenizer.hasMoreTokens()) {
      this.consume("NEWLINE");
    }
    statements.push(firstStatement);

    while (this.tokenizer.hasMoreTokens()) {
      statements.push(this.statementProduction());

      if (this.tokenizer.hasMoreTokens()) {
        this.consume("NEWLINE");
      }
    }

    return {
      type: "StatementList",
      statements: statements.filter((statement) => statement !== undefined),
    };
  }

  statementProduction() {
    if (this.lookahead === null) {
      return null;
    }

    switch (this.lookahead.type) {
      case "INDENTATION":
        throw new SyntaxError(
          "Nieoczekiwane wcięcie.",
          this.lookahead.position
        );
      case "IDENTIFIER":
        return this.assignmentOrCallProduction();
      case "KEYWORD":
        return this.keywordProduction();
      case "NEWLINE":
        break;
      default:
        throw new InternalError(
          `Nieoczekiwane polecenie: ${this.lookahead.type}.`
        );
    }
  }

  blockStatementProduction() {
    if (this.lookahead === null) {
      this.tokenizer.col--;

      throw new SyntaxError("Oczekiwano bloku kodu.", {
        line: this.tokenizer.line,
        column: this.tokenizer.col,
      });
    }

    this.indentationLevel++;
    let setBackBeforeNewline = this.lookahead.position;
    this.consume("NEWLINE");

    const statements = [];
    let continueLoop = true;
    while (
      this.lookahead !== null &&
      this.lookahead.type === "INDENTATION" &&
      continueLoop
    ) {
      const setBack = this.lookahead.position;

      for (let i = 0; i < this.indentationLevel; i++) {
        if (this.lookahead.type !== "INDENTATION") {
          continueLoop = false;
          this.tokenizer.setBack(setBack.line, setBack.column);
          this.lookahead = this.tokenizer.getNextToken();
          break;
        }

        this.consume("INDENTATION");
      }

      if (
        continueLoop &&
        this.lookahead !== null &&
        this.lookahead.type !== "INDENTATION"
      ) {
        statements.push(this.statementProduction());

        if (
          this.lookahead !== null &&
          this.lookahead.value !== "w przeciwnym razie"
        ) {
          setBackBeforeNewline = this.lookahead.position;
          this.consume("NEWLINE");
        }
      }
    }

    if (
      this.lookahead !== null &&
      this.lookahead.value !== "w przeciwnym razie"
    ) {
      this.tokenizer.setBack(
        setBackBeforeNewline.line,
        setBackBeforeNewline.column,
        true
      );
      this.lookahead = this.tokenizer.getNextToken();
    }

    if (statements.length === 0) {
      this.tokenizer.col--;

      throw new SyntaxError("Oczekiwano bloku kodu.", {
        line: this.tokenizer.line,
        column: this.tokenizer.col,
      });
    }

    this.indentationLevel--;
    return {
      type: "BlockStatement",
      statements,
    };
  }

  assignmentOrCallProduction() {
    const identifier = this.consume("IDENTIFIER");

    if (this.lookahead !== null && this.lookahead.type === "PARENTHESIS") {
      return this.callProduction(identifier);
    }

    return this.assignmentStatementProduction(identifier);
  }

  callProduction(identifier) {
    this.consumingCall++;
    const firstParen = this.consume("PARENTHESIS");

    const argumentList = [];
    let consumedComma;
    while (this.lookahead !== null && this.lookahead.type !== "PARENTHESIS") {
      consumedComma = false;
      argumentList.push(this.expressionProduction());

      if (this.lookahead === null) {
        this.tokenizer.col--;

        throw new SyntaxError(
          "Nieoczekiwany koniec wejścia, oczekiwano: nawias okrągły.",
          {
            line: this.tokenizer.line,
            column: this.tokenizer.col,
          }
        );
      }

      if (this.lookahead.type !== "PARENTHESIS") {
        consumedComma = true;
        this.consume("COMMA");
      }
    }

    if (consumedComma) {
      this.expressionProduction();
    }

    this.consume("PARENTHESIS");

    this.consumingCall--;
    return {
      type: "Call",
      identifier: {
        type: "Identifier",
        symbol: identifier.value || identifier.symbol,
        position: identifier.position,
      },
      arguments: argumentList,
      position: firstParen.position,
    };
  }

  assignmentStatementProduction(identifier) {
    let isArray = false;
    let bracket;

    if (this.lookahead === null) {
      this.tokenizer.col--;
      throw new SyntaxError("Nieoczekiwany koniec wejścia, oczekiwano: <-.", {
        line: this.tokenizer.line,
        column: this.tokenizer.col,
      });
    }

    if (this.lookahead.type === "BRACKET") {
      isArray = true;
      bracket = this.bracketProduction();
    }

    const arrowKeyword = this.consume("KEYWORD", "<-");

    if (arrowKeyword.value !== "<-") {
      throw new SyntaxError(
        "Po zmiennej musi wystąpić operator przypisania <-.",
        arrowKeyword.position
      );
    }

    const rightOperand = this.expressionProduction();

    return isArray
      ? {
          type: "AssignmentStatement",
          identifier: {
            type: "ArrayIdentifier",
            symbol: identifier.value,
            position: identifier.position,
            index: bracket.index,
          },
          rightOperand,
        }
      : {
          type: "AssignmentStatement",
          identifier: {
            type: "Identifier",
            symbol: identifier.value,
            position: identifier.position,
          },
          rightOperand,
        };
  }

  expressionProduction() {
    const tokens = [];

    if (this.lookahead === null) {
      this.tokenizer.col--;
      throw new SyntaxError(
        "Nieoczekiwany koniec wejścia, oczekiwano: wyrażenie.",
        {
          line: this.tokenizer.line,
          column: this.tokenizer.col,
        }
      );
    }

    let parensNumber = 0;
    do {
      switch (this.lookahead.type) {
        case "NUMBER":
        case "STRING":
        case "BOOL":
          tokens.push(this.literalProduction());
          break;
        case "OPERATOR":
          tokens.push(this.operatorProduction());
          break;
        case "IDENTIFIER":
          tokens.push(this.identifierProduction());
          break;
        case "PARENTHESIS":
          if (this.lookahead.value === "(") {
            parensNumber++;
          } else {
            parensNumber--;
          }

          if (
            this.lookahead.value === "(" &&
            tokens.length > 0 &&
            tokens.at(-1).type === "Identifier"
          ) {
            parensNumber--;
            tokens.push(this.callProduction(tokens.pop()));
          } else {
            tokens.push(this.parenthesisProduction());
          }

          break;
        case "BRACKET":
          if (this.lookahead.value === "]") {
            throw new SyntaxError(
              "Oczekiwano wyrażenia, znaleziono: ].",
              this.lookahead.position
            );
          }

          tokens.push(this.bracketProduction());
          break;
        default:
          throw new SyntaxError(
            `Nieoczekiwany token: ${this.tokenTrans[this.lookahead.type]}.`,
            this.lookahead.position
          );
      }
    } while (
      !this.ifNextLine &&
      this.lookahead !== null &&
      this.lookahead.type !== "KEYWORD" &&
      this.lookahead.type !== "COMMA" &&
      this.lookahead.type !== "NEWLINE" &&
      !(this.lookahead.type === "BRACKET" && this.lookahead.value === "]") &&
      !(
        this.consumingCall !== 0 &&
        this.lookahead.type === "PARENTHESIS" &&
        this.lookahead.value === ")"
      )
    );

    if (tokens.length === 0) {
      throw new SyntaxError(
        `Oczekiwano wyrażenia, znaleziono: ${
          this.tokenTrans[this.lookahead.type]
        }.`,
        this.lookahead.position
      );
    }

    if (parensNumber !== 0 && this.consumingCall === 0) {
      this.tokenizer.col--;

      throw new SyntaxError(
        `Oczekiwano zamknięcia nawiasu okrągłego, znaleziono: ${
          this.lookahead === null
            ? "koniec wejścia"
            : this.tokenTrans[this.lookahead.type]
        }.`,
        this.lookahead === null
          ? {
              line: this.tokenizer.line,
              column: this.tokenizer.col,
            }
          : this.lookahead.position
      );
    }

    return this._parseParens(tokens);
  }

  _parseParens(tokens) {
    const subexpressions = [];
    const tempSubexpressions = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].symbol === "(") {
        tempSubexpressions.push([]);
      } else if (tokens[i].symbol === ")") {
        subexpressions.push(tempSubexpressions.pop());
      } else {
        if (tempSubexpressions.length > 0) {
          tempSubexpressions.at(-1).push(tokens[i]);
        } else {
          subexpressions.push(tokens[i]);
        }
      }
    }

    const result = [];
    for (const subexpression of subexpressions) {
      if (Array.isArray(subexpression)) {
        result.push(this._parseParens(subexpression));
      } else {
        result.push(subexpression);
      }
    }

    return this._parseExpression(result);
  }

  _parseExpression(tokens) {
    const precedence = [
      ["[]"],
      ["*", "/", "div", "mod"],
      ["+", "-"],
      [">", "<", ">=", "<=", "==", "!="],
      ["nie"],
      ["oraz"],
      ["lub"],
    ];

    for (const operators of precedence) {
      while (
        operators.some((operator) =>
          tokens.find((el) => el.symbol === operator)
        )
      ) {
        for (let i = 0; i < tokens.length; i++) {
          if (operators.includes(tokens[i].symbol)) {
            if (tokens[i].symbol === "nie") {
              const unOp = this.unaryOperationProduction(
                tokens[i],
                tokens[i + 1]
              );
              tokens.splice(i, 2, unOp);
            } else if (tokens[i].symbol === "[]") {
              const unOp = this.unaryOperationProduction(
                tokens[i],
                tokens[i - 1]
              );

              tokens.splice(i - 1, 2, unOp);
            } else {
              const binOp = this.binaryOperationProduction(
                tokens[i - 1],
                tokens[i],
                tokens[i + 1]
              );

              if (binOp.type === "NumericLiteral") {
                tokens.splice(i, 2, binOp);
              } else {
                tokens.splice(i - 1, 3, binOp);
              }
            }
            break;
          }
        }
      }
    }

    if (tokens.length > 1) {
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === "Identifier" && i % 2 === 1) {
          throw new SyntaxError(
            `Nieoczekiwana zmienna: ${token.symbol}.`,
            token.position
          );
        }
      }
    }

    return tokens[0];
  }

  unaryOperationProduction(operator, operand) {
    return {
      type: "UnaryOperation",
      operator,
      operand,
      position: operator.position,
    };
  }

  binaryOperationProduction(leftOperand, operator, rightOperand) {
    if (leftOperand === undefined && operator.symbol === "-") {
      return {
        type: "NumericLiteral",
        value: -rightOperand.value,
        position: operator.position,
      };
    }

    return {
      type: "BinaryOperation",
      leftOperand,
      operator,
      rightOperand,
      position: leftOperand.position,
    };
  }

  literalProduction() {
    switch (this.lookahead.type) {
      case "NUMBER":
        return this.numericLiteralProduction();
      case "STRING":
        return this.stringLiteralProduction();
      case "BOOL":
        return this.boolLiteralProduction();
      default:
        throw new InternalError(
          `Nieoczekiwany literał: ${this.lookahead.type}.`,
          this.tokenizer.line,
          this.tokenizer.col
        );
    }
  }

  numericLiteralProduction() {
    const token = this.consume("NUMBER");

    return {
      type: "NumericLiteral",
      value: parseFloat(token.value),
      position: token.position,
    };
  }

  stringLiteralProduction() {
    const token = this.consume("STRING");

    return {
      type: "StringLiteral",
      value: token.value.slice(1, -1),
      position: token.position,
    };
  }

  boolLiteralProduction() {
    const token = this.consume("BOOL");

    return {
      type: "BoolLiteral",
      value: token.value === "PRAWDA",
      position: token.position,
    };
  }

  identifierProduction() {
    const identifier = this.consume("IDENTIFIER");

    return {
      type: "Identifier",
      symbol: identifier.value,
      position: identifier.position,
    };
  }

  parenthesisProduction() {
    const parenthesis = this.consume("PARENTHESIS");

    return {
      type: "Parenthesis",
      symbol: parenthesis.value,
      position: parenthesis.position,
    };
  }

  bracketProduction() {
    const bracket = this.consume("BRACKET");
    const expression = this.expressionProduction();
    this.consume("BRACKET");

    return {
      type: "Operator",
      symbol: "[]",
      index: expression,
      position: bracket.position,
    };
  }

  operatorProduction() {
    const operator = this.consume("OPERATOR");

    return {
      type: "Operator",
      symbol: operator.value,
      position: operator.position,
    };
  }

  keywordProduction() {
    switch (this.lookahead.value) {
      case "dla":
        return this.forLoopProduction();
      case "dopóki":
        return this.whileLoopProduction();
      case "jeżeli":
        return this.ifProduction();
      case "w przeciwnym razie":
        this.consume("KEYWORD");
        break;
      case "funkcja":
        return this.functionProduction();
      case "zwróć":
        return this.returnProduction();
      case "wypisz":
        return this.printProduction();
      default:
        throw new InternalError(
          `Nieoczekiwane słowo kluczowe: ${this.lookahead.value}.`
        );
    }
  }

  forLoopProduction() {
    const forKeyword = this.consume("KEYWORD");
    const identifier = this.consume("IDENTIFIER");
    const equalsKeyword = this.consume("KEYWORD");

    if (equalsKeyword.value !== "=") {
      throw new SyntaxError(
        `Nieoczekiwane słowo kluczowe: ${equalsKeyword.value}, oczekiwano: =.`,
        equalsKeyword.position
      );
    }

    const start = this.expressionProduction();
    this.consume("COMMA");
    const second = this.expressionProduction();
    this.consume("COMMA");
    this.consume("ELLIPSIS");
    this.consume("COMMA");
    const end = this.expressionProduction();
    this.consume("KEYWORD", "wykonuj");

    const body = this.blockStatementProduction();

    return {
      type: "ForLoop",
      identifier: {
        type: "Identifier",
        symbol: identifier.value,
      },
      start,
      second,
      end,
      body,
      position: forKeyword.position,
    };
  }

  whileLoopProduction() {
    const whileKeyword = this.consume("KEYWORD");
    const expression = this.expressionProduction();
    this.consume("KEYWORD");
    const body = this.blockStatementProduction();

    return {
      type: "WhileLoop",
      condition: expression,
      body,
      position: whileKeyword.position,
    };
  }

  ifProduction() {
    const _if = this.consume("KEYWORD");
    const expression = this.expressionProduction();
    const thenKeyword = this.consume("KEYWORD", "to");

    if (thenKeyword.value !== "to") {
      throw new SyntaxError(
        `Nieoczekiwane słowo kluczowe: ${thenKeyword.value}, oczekiwano: to.`,
        thenKeyword.position
      );
    }

    const body = this.blockStatementProduction();

    let elseBlock;
    if (
      this.lookahead !== null &&
      this.lookahead.value === "w przeciwnym razie"
    ) {
      const elseKeyword = this.consume("KEYWORD");
      const elseBody = this.blockStatementProduction();

      elseBlock = {
        type: "Else",
        body: elseBody,
        position: elseKeyword.position,
      };
    }

    const ifBlock = {
      type: "If",
      condition: expression,
      body,
      position: _if.position,
    };

    if (elseBlock !== undefined) {
      ifBlock.else = elseBlock;
    }

    return ifBlock;
  }

  parameterListProduction() {
    const firstParen = this.consume("PARENTHESIS");

    const parameterList = [];
    while (this.lookahead.type !== "PARENTHESIS") {
      parameterList.push(this.identifierProduction());

      if (this.lookahead.type !== "PARENTHESIS") {
        this.consume("COMMA");
      }
    }

    this.consume("PARENTHESIS");

    return {
      type: "ParameterList",
      parameters: parameterList,
      position: firstParen.position,
    };
  }

  returnProduction() {
    const returnKeyword = this.consume("KEYWORD");

    if (this.definingFunction === 0) {
      throw new SyntaxError(
        "Słowo kluczowe ZWRÓĆ poza funkcją.",
        returnKeyword.position
      );
    }

    debugger;
    const expression =
      this.lookahead.type === "NEWLINE" ? null : this.expressionProduction();
    return {
      type: "Return",
      value: expression,
    };
  }

  functionProduction() {
    const functionKeyword = this.consume("KEYWORD");
    const functionName = this.consume("IDENTIFIER");
    const parameters = this.parameterListProduction();
    this.definingFunction++;
    const body = this.blockStatementProduction();

    this.definingFunction--;
    return {
      type: "Function",
      identifier: {
        type: "Identifier",
        symbol: functionName.value,
        position: functionName.position,
      },
      parameters,
      body,
      position: functionKeyword.position,
    };
  }

  printProduction() {
    const printKeyword = this.consume("KEYWORD");
    const expression = this.expressionProduction();

    return {
      type: "PrintStatement",
      value: expression,
      position: printKeyword.position,
    };
  }
}

class Interpreter {
  execute(
    code,
    startingBindings = {},
    ifLogOutput = true,
    firstIndexStrings = 1,
    firstIndexArrays = 1
  ) {
    const builtins = [
      {
        identifier: "sufit",
        parameters: ["liczba"],
        function: (number) => {
          if (typeof number !== "number") {
            throw new BuiltinFunctionError(
              "Argumentem funkcji sufit musi być liczba."
            );
          }

          return Math.ceil(number);
        },
      },
      {
        identifier: "podloga",
        parameters: ["liczba"],
        function: (number) => {
          if (typeof number !== "number") {
            throw new BuiltinFunctionError(
              "Argumentem funkcji podloga musi być liczba."
            );
          }

          return Math.floor(number);
        },
      },
      {
        identifier: "dl",
        parameters: ["tablica"],
        function: (array) => {
          if (typeof array !== "string" && !Array.isArray(array)) {
            throw new BuiltinFunctionError(
              "Argumentem funkcji dl musi być tablica lub napis."
            );
          }

          return array.length;
        },
      },
      {
        identifier: "napis",
        parameters: ["liczba"],
        function: (number) => {
          if (typeof number !== "number") {
            throw new BuiltinFunctionError(
              "Argumentem funkcji napis musi być liczba."
            );
          }

          return String(number);
        },
      },
    ];

    const builtinBindings = builtins.reduce((acc, curr) => {
      acc[curr.identifier] = {
        type: "builtin",
        parameters: {
          type: "ParametersList",
          parameters: curr.parameters.map((parameter) => ({
            type: "Identifier",
            symbol: parameter,
          })),
        },
        function: curr.function,
      };

      return acc;
    }, {});
    this.callStack = [{ ...startingBindings, ...builtinBindings }];
    this.firstIndexArrays = firstIndexArrays;
    this.firstIndexStrings = firstIndexStrings;
    this.ifLogOutput = ifLogOutput;
    this.returnValue = null;
    this.output = [];

    const parser = new Parser();
    const ast = parser.parse(code);

    for (const statement of ast.body.statements) {
      this.executeStatement(statement);
    }

    return this.output;
  }

  executeStatement(statement) {
    switch (statement.type) {
      case "BlockStatement":
        for (const substatement of statement.statements) {
          this.executeStatement(substatement);

          if (this.returnValue !== null) {
            return this.returnValue.value;
          }
        }
        break;
      case "Identifier":
        return this.executeIdentifier(statement);
      case "NumericLiteral":
      case "StringLiteral":
      case "BoolLiteral":
        return this.executeLiteral(statement);
      case "UnaryOperation":
        return this.executeUnaryOperation(statement);
      case "BinaryOperation":
        return this.executeBinaryOperation(statement);
      case "AssignmentStatement":
        this.executeAssignment(statement);
        break;
      case "WhileLoop":
        this.executeWhileLoop(statement);
        break;
      case "ForLoop":
        this.executeForLoop(statement);
        break;
      case "If":
        this.executeIf(statement);
        break;
      case "Function":
        this.executeFunction(statement);
        break;
      case "Call":
        return this.executeCall(statement);
      case "Return":
        const returnValue = this.executeReturn(statement);
        this.returnValue = {
          type: "RETURN",
          value: returnValue,
        };
        break;
      case "PrintStatement":
        this.executePrint(statement);
        break;
      default:
        throw new InternalError(`Nieznany typ polecenia: ${statement.type}.`);
    }
  }

  executeIdentifier(statement) {
    let value = null;
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      const bindings = this.callStack[i];
      if (statement.symbol in bindings) {
        value = bindings[statement.symbol];
        break;
      }
    }

    if (value === null) {
      throw new RuntimeError(
        `Nieznana zmienna: ${statement.symbol}.`,
        statement.position,
        this.output
      );
    }

    return value;
  }

  executeLiteral(statement) {
    return statement.value;
  }

  executeUnaryOperation(statement) {
    switch (statement.operator.symbol) {
      case "nie":
        return !this.executeStatement(statement.operand);
      case "[]":
        const index = this.executeStatement(statement.operator.index);
        const executedStatement = this.executeStatement(statement.operand);

        if (
          typeof executedStatement !== "string" &&
          !Array.isArray(executedStatement)
        ) {
          throw new RuntimeError(
            `Zmienna ${statement.operand.symbol} nie jest tablicą ani napisem.`,
            statement.position,
            this.output
          );
        }

        const result =
          typeof executedStatement === "string"
            ? executedStatement.charAt(index - this.firstIndexStrings)
            : executedStatement[index - this.firstIndexArrays];

        if (result === undefined) {
          throw new RuntimeError(
            `Indeks ${index} poza długością tablicy ${statement.operand.symbol}.`,
            {
              line: statement.operator.position.line,
              column: statement.operator.position.column + 1,
            },
            this.output
          );
        }

        return result;
      default:
        throw new InternalError(
          `Nieznany operator: ${statement.operator.symbol}.`
        );
    }
  }

  executeBinaryOperation(statement) {
    const leftOperand = this.executeStatement(statement.leftOperand);

    if (statement.operator.symbol === "oraz") {
      if (typeof leftOperand === "boolean" && !leftOperand) {
        return false;
      }

      const rightOperand = this.executeStatement(statement.rightOperand);
      if (
        typeof leftOperand !== "boolean" ||
        typeof rightOperand !== "boolean"
      ) {
        throw new RuntimeError(
          "Spójników logicznych można używać jedynie na wartościach PRAWDA/FAŁSZ.",
          statement.position
        );
      }

      return leftOperand && rightOperand;
    }

    if (statement.operator.symbol === "lub") {
      if (typeof leftOperand === "boolean" && leftOperand) {
        return true;
      }

      const rightOperand = this.executeStatement(statement.rightOperand);
      if (
        typeof leftOperand !== "boolean" ||
        typeof rightOperand !== "boolean"
      ) {
        throw new RuntimeError(
          "Spójników logicznych można używać jedynie na wartościach PRAWDA/FAŁSZ.",
          statement.position
        );
      }

      return leftOperand || rightOperand;
    }

    const rightOperand = this.executeStatement(statement.rightOperand);
    switch (statement.operator.symbol) {
      case "+":
        if (
          !(
            typeof leftOperand === "number" && typeof rightOperand === "number"
          ) &&
          !(typeof leftOperand === "string" && typeof rightOperand === "string")
        ) {
          throw new RuntimeError(
            "Operację dodawania można wykonać tylko albo na liczbach, albo na napisach.",
            statement.position
          );
        }

        return leftOperand + rightOperand;
      case "-":
        if (
          typeof leftOperand !== "number" ||
          typeof rightOperand !== "number"
        ) {
          throw new RuntimeError(
            "Operacje arytmetyczne można wykonywać tylko na liczbach.",
            statement.position
          );
        }

        return leftOperand - rightOperand;
      case "*":
        if (
          typeof leftOperand !== "number" ||
          typeof rightOperand !== "number"
        ) {
          throw new RuntimeError(
            "Operacje arytmetyczne można wykonywać tylko na liczbach.",
            statement.position
          );
        }

        return leftOperand * rightOperand;
      case "/":
        if (
          typeof leftOperand !== "number" ||
          typeof rightOperand !== "number"
        ) {
          throw new RuntimeError(
            "Operacje arytmetyczne można wykonywać tylko na liczbach.",
            statement.position
          );
        }

        return leftOperand / rightOperand;
      case "div":
        if (
          typeof leftOperand !== "number" ||
          typeof rightOperand !== "number"
        ) {
          throw new RuntimeError(
            "Operacje arytmetyczne można wykonywać tylko na liczbach.",
            statement.position
          );
        }

        return Math.floor(leftOperand / rightOperand);
      case "mod":
        if (
          typeof leftOperand !== "number" ||
          typeof rightOperand !== "number"
        ) {
          throw new RuntimeError(
            "Operacje arytmetyczne można wykonywać tylko na liczbach.",
            statement.position
          );
        }

        return leftOperand % rightOperand;
      case ">":
        if (
          typeof leftOperand !== typeof rightOperand ||
          typeof leftOperand === "boolean" ||
          typeof rightOperand === "boolean"
        ) {
          throw new RuntimeError(
            "Porównywać można tylko albo liczby, albo napisy.",
            statement.position
          );
        }

        return leftOperand > rightOperand;
      case "<":
        if (
          typeof leftOperand !== typeof rightOperand ||
          typeof leftOperand === "boolean" ||
          typeof rightOperand === "boolean"
        ) {
          throw new RuntimeError(
            "Porównywać można tylko albo liczby, albo napisy.",
            statement.position
          );
        }

        return leftOperand < rightOperand;
      case ">=":
        if (
          typeof leftOperand !== typeof rightOperand ||
          typeof leftOperand === "boolean" ||
          typeof rightOperand === "boolean"
        ) {
          throw new RuntimeError(
            "Porównywać można tylko albo liczby, albo napisy.",
            statement.position
          );
        }

        return leftOperand >= rightOperand;
      case "<=":
        if (
          typeof leftOperand !== typeof rightOperand ||
          typeof leftOperand === "boolean" ||
          typeof rightOperand === "boolean"
        ) {
          throw new RuntimeError(
            "Porównywać można tylko albo liczby, albo napisy.",
            statement.position
          );
        }

        return leftOperand <= rightOperand;
      case "==":
        if (typeof leftOperand !== typeof rightOperand) {
          throw new RuntimeError(
            "Porównywać można tylko wartości tego samego typu.",
            statement.position
          );
        }

        return leftOperand === rightOperand;
      case "!=":
        if (typeof leftOperand !== typeof rightOperand) {
          throw new RuntimeError(
            "Porównywać można tylko wartości tego samego typu.",
            statement.position
          );
        }

        return leftOperand !== rightOperand;
      default:
        throw new InternalError(
          `Nieznany operator: ${statement.operator.symbol}.`
        );
    }
  }

  executeAssignment(statement) {
    const rightOperand = this.executeStatement(statement.rightOperand);
    if (rightOperand === null || rightOperand === undefined) {
      throw new RuntimeError(
        `Funkcja ${statement.rightOperand.identifier.symbol} nic nie zwróciła.`,
        statement.rightOperand.position
      );
    }

    if (statement.identifier.type === "ArrayIdentifier") {
      let value = null;
      let localBindings;
      for (let i = this.callStack.length - 1; i >= 0; i--) {
        const bindings = this.callStack[i];
        if (statement.identifier.symbol in bindings) {
          value = bindings[statement.identifier.symbol];
          localBindings = bindings;
          break;
        }
      }

      if (value === null) {
        value = [];
        this.callStack.at(-1)[statement.identifier.symbol] = value;
        localBindings = this.callStack.at(-1);
      }

      if (typeof value !== "string" && !Array.isArray(value)) {
        throw new RuntimeError(
          `Zmienna ${statement.identifier.symbol} nie jest tablicą ani napisem.`,
          statement.identifier.position,
          this.output
        );
      }

      const indexAddend =
        typeof value === "string"
          ? this.firstIndexStrings
          : this.firstIndexArrays;
      const index =
        this.executeStatement(statement.identifier.index) - indexAddend;
      if (index < 0) {
        throw new RuntimeError(
          `Indeks ${index + indexAddend} poza długością tablicy/napisu ${
            statement.identifier.symbol
          }.`,
          statement.identifier.index.position,
          this.output
        );
      }

      if (Array.isArray(value)) {
        value[index] = rightOperand;
      } else {
        if (index > value.length) {
          throw new RuntimeError(
            `Indeks ${index + indexAddend} poza długością napisu ${
              statement.identifier.symbol
            }.`,
            statement.identifier.index.position,
            this.output
          );
        }

        if (typeof rightOperand !== "string" || rightOperand?.length !== 1) {
          throw new RuntimeError(
            `W napisie można zamienić jedynie pojedynczy znak na inny znak.`,
            statement.identifier.position,
            this.output
          );
        }

        localBindings[statement.identifier.symbol] =
          value.substring(0, index) + rightOperand + value.substring(index + 1);
      }
    } else if (statement.identifier.type === "Identifier") {
      this.callStack.at(-1)[statement.identifier.symbol] = rightOperand;
    } else {
      throw new InternalError(
        `Nieznany typ identyfikatora: ${statement.identifier.type}.`
      );
    }
  }

  executeWhileLoop(statement) {
    let condition;
    while ((condition = this.executeStatement(statement.condition))) {
      if (typeof condition !== "boolean") {
        throw new RuntimeError(
          "Wyrażenie pętli DOPÓKI musi ewaluować do wartości PRAWDA/FAŁSZ.",
          statement.position,
          this.output
        );
      }

      this.executeStatement(statement.body);

      if (this.returnValue !== null) {
        return;
      }
    }
  }

  executeForLoop(statement) {
    const start = this.executeStatement(statement.start);
    const second = this.executeStatement(statement.second);
    const end = this.executeStatement(statement.end);

    const step = second - start;

    if (step > 0) {
      for (let i = start; i <= end; i += step) {
        this.callStack.at(-1)[statement.identifier.symbol] = i;

        this.executeStatement(statement.body);

        if (this.returnValue !== null) {
          return;
        }
      }
    } else if (step < 0) {
      for (let i = start; i >= end; i += step) {
        this.callStack.at(-1)[statement.identifier.symbol] = i;

        this.executeStatement(statement.body);

        if (this.returnValue !== null) {
          return;
        }
      }
    }
  }

  executeIf(statement) {
    const condition = this.executeStatement(statement.condition);

    if (typeof condition !== "boolean") {
      throw new RuntimeError(
        "Wyrażenie bloku JEŻELI musi ewaluować do wartości PRAWDA/FAŁSZ.",
        statement.condition.position,
        this.output
      );
    }

    if (condition) {
      this.executeStatement(statement.body);
    } else if (statement.else !== undefined) {
      this.executeStatement(statement.else.body);
    }
  }

  executeFunction(statement) {
    this.callStack.at(-1)[statement.identifier.symbol] = {
      type: "user-defined",
      parameters: statement.parameters,
      body: statement.body,
    };
  }

  executeCall(statement) {
    let value = null;
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      const bindings = this.callStack[i];
      if (statement.identifier.symbol in bindings) {
        value = bindings[statement.identifier.symbol];
        break;
      }
    }

    if (value === null) {
      throw new RuntimeError(
        `Nieznana zmienna: ${statement.identifier.symbol}.`,
        statement.identifier.position,
        this.output
      );
    }

    if (typeof value !== "object") {
      throw new RuntimeError(
        `Zmienna ${statement.identifier.symbol} nie jest funkcją.`,
        statement.position,
        this.output
      );
    }

    if (value.parameters.parameters.length !== statement.arguments.length) {
      throw new RuntimeError(
        `Funkcja ${statement.identifier.symbol} przyjmuje liczbę argumentów: ${value.parameters.parameters.length}, otrzymała liczbę argumentów: ${statement.arguments.length}.`,
        statement.position,
        this.output
      );
    }

    if (value.type === "builtin") {
      const args = statement.arguments.map((argumentObj) =>
        this.executeStatement(argumentObj)
      );

      if (args.length !== value.function.length) {
        throw new RuntimeError(
          `Funkcja ${statement.identifier.symbol} przyjmuje liczbę argumentów: ${value.function.length}, otrzymała liczbę argumentów: ${args.length}.`
        );
      }

      try {
        return value.function(...args);
      } catch (err) {
        if (err instanceof BuiltinFunctionError) {
          throw new RuntimeError(err.message, statement.identifier.position);
        }

        throw new InternalError(err.message);
      }
    } else if (value.type === "user-defined") {
      const localBindings = statement.arguments.reduce((acc, curr, idx) => {
        acc[value.parameters.parameters[idx].symbol] =
          this.executeStatement(curr);
        return acc;
      }, {});

      this.callStack.push(localBindings);

      if (this.callStack.length > 999) {
        throw new RuntimeError("Przepełnienie stosu!", statement.position);
      }

      const returnValue = this.executeStatement(value.body);
      this.callStack.pop();
      this.returnValue = null;
      return returnValue;
    } else {
      throw new InternalError(`Nieoczekiwany typ funkcji: ${statement.type}.`);
    }
  }

  executeReturn(statement) {
    return statement.value && this.executeStatement(statement.value);
  }

  executePrint(statement) {
    const executedStatement = this.executeStatement(statement.value);

    if (executedStatement === null || executedStatement === undefined) {
      throw new RuntimeError(
        `Funkcja ${statement.value.identifier.symbol} nic nie zwróciła.`,
        statement.value.position
      );
    }

    let output = executedStatement;
    if (typeof executedStatement === "boolean") {
      output = executedStatement ? "PRAWDA" : "FAŁSZ";
    } else if (Array.isArray(executedStatement)) {
      output = [...executedStatement];
    }

    if (this.ifLogOutput) {
      console.log(output);
    }

    this.output.push(output);
  }
}

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
