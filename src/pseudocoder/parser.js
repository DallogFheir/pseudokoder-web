import Tokenizer from "./tokenizer.js";
import { SyntaxError, InternalError } from "./errors.js";

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

export default Parser;
