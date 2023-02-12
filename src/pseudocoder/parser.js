import Tokenizer from "./tokenizer.js";
import { SyntaxError, InternalError } from "./errors.js";

class Parser {
  constructor() {
    this.ifNextLine = false;
    this.indentationLevel = 0;
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
        `Nieoczekiwany koniec wejścia, oczekiwano ${expected ?? type}.`,
        {
          line: this.tokenizer.line,
          column: this.tokenizer.col,
        }
      );
    }

    if (this.lookahead.type !== type) {
      throw new SyntaxError(
        `Nieoczekiwany token: ${this.lookahead.type}, oczekiwano: ${
          expected ?? type
        }.`,
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

    statements.push(firstStatement);

    while (this.tokenizer.hasMoreTokens()) {
      statements.push(this.statementProduction());
    }

    return {
      type: "StatementList",
      statements,
    };
  }

  statementProduction() {
    if (this.lookahead === null) {
      return null;
    }

    switch (this.lookahead.type) {
      case "IDENTIFIER":
        return this.assignmentOrCallProduction();
      case "KEYWORD":
        return this.keywordProduction();
      default:
        throw new InternalError(
          `Nieoczekiwane polecenie: ${this.lookahead.type}.`
        );
    }
  }

  blockStatementProduction() {
    this.indentationLevel++;

    debugger;
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

      if (continueLoop) {
        statements.push(this.statementProduction());
      }
    }

    this.indentationLevel--;
    return {
      type: "BlockStatement",
      statements,
    };
  }

  assignmentOrCallProduction() {
    const identifier = this.consume("IDENTIFIER");

    if (this.lookahead.type === "PARENTHESIS") {
      return this.callProduction(identifier);
    }

    return this.assignmentStatementProduction(identifier);
  }

  callProduction(identifier) {
    const firstParen = this.consume("PARENTHESIS");

    const argumentList = [];
    let consumedComma;
    while (this.lookahead.type !== "PARENTHESIS") {
      consumedComma = false;
      argumentList.push(this.expressionProduction());

      if (this.lookahead.type !== "PARENTHESIS") {
        consumedComma = true;
        this.consume("COMMA");
      }
    }

    if (consumedComma) {
      this.expressionProduction();
    }

    this.consume("PARENTHESIS");

    return {
      type: "Call",
      identifier: {
        type: "Identifier",
        symbol: identifier.value,
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
      throw new SyntaxError(
        "Nieoczekiwany koniec wejścia, oczekiwano: OPERATOR.",
        {
          line: this.tokenizer.line + 1,
          column: this.tokenizer.col,
        }
      );
    }

    if (this.lookahead.type === "BRACKET") {
      isArray = true;
      bracket = this.bracketProduction();
    }

    const operator = this.consume("OPERATOR");

    if (operator.value !== "<-") {
      throw new SyntaxError(
        "Po zmiennej musi wystąpić operator przypisania <-.",
        operator.position
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
          if (this.lookahead.value === ")") {
            throw new SyntaxError(
              "Oczekiwano wyrażenia, znaleziono: ).",
              this.lookahead.position
            );
          }

          tokens.push(this.parenthesisProduction());
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
            `Nieoczekiwany token: ${this.lookahead.type}.`,
            this.lookahead.position
          );
      }
    } while (
      !this.ifNextLine &&
      this.lookahead.type !== "KEYWORD" &&
      this.lookahead.type !== "COMMA" &&
      !(this.lookahead.type === "BRACKET" && this.lookahead.value === "]") &&
      !(this.lookahead.type === "PARENTHESIS" && this.lookahead.value === ")")
    );

    if (tokens.length === 0) {
      throw new SyntaxError(
        `Oczekiwano wyrażenia, znaleziono: ${this.lookahead.type}.`,
        this.lookahead.position
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
        for (let i = 1; i < tokens.length; i++) {
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
              tokens.splice(i - 1, 3, binOp);
            }
            break;
          }
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
      value: Number(token.value),
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
      value: token.value,
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
    const operator = this.consume("OPERATOR");

    if (operator.value !== "=") {
      throw new SyntaxError(
        `Nieoczekiwany operator: ${operator.value}, oczekiwano: =.`,
        operator.position
      );
    }

    const start = this.expressionProduction();
    this.consume("COMMA");
    const second = this.expressionProduction();
    this.consume("COMMA");
    this.consume("ELLIPSIS");
    this.consume("COMMA");
    const end = this.expressionProduction();
    this.consume("KEYWORD");

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
    this.consume("KEYWORD", "to");
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

  functionProduction() {
    const functionKeyword = this.consume("KEYWORD");
    const functionName = this.consume("IDENTIFIER");
    const parameters = this.parameterListProduction();
    const body = this.blockStatementProduction();

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
