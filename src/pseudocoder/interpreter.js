import Parser from "./parser.js";
import { RuntimeError, InternalError } from "./errors.js";

class Interpreter {
  execute(code, startingBindings = {}, firstIndex = 1, ifLogOutput = true) {
    this.bindings = { ...startingBindings };
    this.callStack = [];
    this.firstIndex = firstIndex;
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
        this.executeCall(statement);
        break;
      case "PrintStatement":
        this.executePrint(statement);
        break;
      default:
        throw new InternalError(`Nieznany typ polecenia: ${statement.type}.`);
    }
  }

  executeIdentifier(statement) {
    const bindings =
      this.callStack.length > 0
        ? this.callStack.at(-1).bindings
        : this.bindings;

    if (!(statement.symbol in bindings)) {
      throw new RuntimeError(
        `Nieznana zmienna: ${statement.symbol}.`,
        statement.position
      );
    }

    return bindings[statement.symbol];
  }

  executeLiteral(statement) {
    return statement.value;
  }

  executeUnaryOperation(statement) {
    switch (statement.operator.symbol) {
      case "nie":
        return !this.executeStatement(statement.operand);
      case "[]":
        const index =
          this.executeStatement(statement.operator.index) - this.firstIndex;
        const executedStatement = this.executeStatement(statement.operand);

        if (
          typeof executedStatement !== "string" &&
          !Array.isArray(executedStatement)
        ) {
          throw new RuntimeError(
            `Zmienna ${statement.operand.symbol} nie jest tablicą ani napisem.`,
            statement.position
          );
        }

        const result =
          typeof executedStatement === "string"
            ? executedStatement.charAt(index)
            : executedStatement[index];

        if (result === undefined) {
          throw new RuntimeError(
            `Indeks ${index} poza długością tablicy ${statement.operand.symbol}.`,
            {
              line: statement.operator.position.line,
              column: statement.operator.position.column + 1,
            }
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
    switch (statement.operator.symbol) {
      case "+":
        return (
          this.executeStatement(statement.leftOperand) +
          this.executeStatement(statement.rightOperand)
        );
      case "-":
        return (
          this.executeStatement(statement.leftOperand) -
          this.executeStatement(statement.rightOperand)
        );
      case "*":
        return (
          this.executeStatement(statement.leftOperand) *
          this.executeStatement(statement.rightOperand)
        );
      case "/":
        return (
          this.executeStatement(statement.leftOperand) /
          this.executeStatement(statement.rightOperand)
        );
      case "div":
        return Math.floor(
          this.executeStatement(statement.leftOperand) /
            this.executeStatement(statement.rightOperand)
        );
      case "mod":
        return (
          this.executeStatement(statement.leftOperand) %
          this.executeStatement(statement.rightOperand)
        );
      case ">":
        return (
          this.executeStatement(statement.leftOperand) >
          this.executeStatement(statement.rightOperand)
        );
      case "<":
        return (
          this.executeStatement(statement.leftOperand) <
          this.executeStatement(statement.rightOperand)
        );
      case ">=":
        return (
          this.executeStatement(statement.leftOperand) >=
          this.executeStatement(statement.rightOperand)
        );
      case "<=":
        return (
          this.executeStatement(statement.leftOperand) <=
          this.executeStatement(statement.rightOperand)
        );
      case "==":
        return (
          this.executeStatement(statement.leftOperand) ===
          this.executeStatement(statement.rightOperand)
        );
      case "!=":
        return (
          this.executeStatement(statement.leftOperand) !==
          this.executeStatement(statement.rightOperand)
        );
      case "oraz":
        return (
          this.executeStatement(statement.leftOperand) &&
          this.executeStatement(statement.rightOperand)
        );
      case "lub":
        return (
          this.executeStatement(statement.leftOperand) ||
          this.executeStatement(statement.rightOperand)
        );
      default:
        throw new InternalError(
          `Nieznany operator: ${statement.operator.symbol}.`
        );
    }
  }

  executeAssignment(statement) {
    const bindings =
      this.callStack.length > 0
        ? this.callStack.at(-1).bindings
        : this.bindings;

    if (statement.identifier.type === "ArrayIdentifier") {
      if (!(statement.identifier.symbol in bindings)) {
        bindings[statement.identifier.symbol] = [];
      }

      const index =
        this.executeStatement(statement.identifier.index) - this.firstIndex;
      if (index < 0) {
        throw new RuntimeError(
          `Indeks ${index + this.firstIndex} poza długością tablicy ${
            statement.identifier.symbol
          }.`,
          statement.identifier.index.position
        );
      }

      bindings[statement.identifier.symbol][index] = this.executeStatement(
        statement.rightOperand
      );
    } else if (statement.identifier.type === "Identifier") {
      bindings[statement.identifier.symbol] = this.executeStatement(
        statement.rightOperand
      );
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
          statement.position
        );
      }

      this.executeStatement(statement.body);
    }
  }

  executeForLoop(statement) {
    const start = this.executeStatement(statement.start);
    const second = this.executeStatement(statement.second);
    const end = this.executeStatement(statement.end);

    const step = second - start;

    if (step > 0) {
      if (end < start) {
        throw new RuntimeError(
          "Wyrażenie końcowe pętli DLA musi być większe lub równe początkowemu przy dodatnim kroku.",
          statement.position
        );
      }

      for (let i = start; i <= end; i += step) {
        this.bindings[statement.identifier.symbol] = i;

        this.executeStatement(statement.body);
      }
    } else if (step < 0) {
      if (end > start) {
        throw new RuntimeError(
          "Wyrażenie końcowe pętli DLA musi być mniejsze lub równe początkowemu przy ujemnym kroku.",
          statement.position
        );
      }

      for (let i = start; i >= end; i += step) {
        this.bindings[statement.identifier.symbol] = i;

        this.executeStatement(statement.body);
      }
    }
  }

  executeIf(statement) {
    const condition = this.executeStatement(statement.condition);

    if (typeof condition !== "boolean") {
      throw new RuntimeError(
        "Wyrażenie bloku JEŻELI musi ewaluować do wartości PRAWDA/FAŁSZ.",
        statement.condition.position
      );
    }

    if (condition) {
      this.executeStatement(statement.body);
    } else if (statement.else !== undefined) {
      this.executeStatement(statement.else.body);
    }
  }

  executeFunction(statement) {
    this.bindings[statement.identifier.symbol] = {
      parameters: statement.parameters,
      body: statement.body,
    };
  }

  executeCall(statement) {
    if (!(statement.identifier.symbol in this.bindings)) {
      throw new RuntimeError(
        `Nieznana zmienna: ${statement.identifier.symbol}.`,
        statement.identifier.position
      );
    }

    const binding = this.bindings[statement.identifier.symbol];

    if (typeof binding !== "object") {
      throw new RuntimeError(
        `Zmienna ${statement.identifier.symbol} nie jest funkcją.`,
        statement.position
      );
    }

    if (binding.parameters.parameters.length !== statement.arguments.length) {
      throw new RuntimeError(
        `Funkcja ${statement.identifier.symbol} przyjmuje liczbę argumentów: ${binding.parameters.parameters.length}, otrzymała liczbę argumentów: ${statement.arguments.length}.`,
        statement.position
      );
    }

    const localBindings = {
      bindings: statement.arguments.reduce((acc, curr, idx) => {
        acc[binding.parameters.parameters[idx].symbol] =
          this.executeStatement(curr);
        return acc;
      }, {}),
    };

    this.callStack.push(localBindings);
    this.executeStatement(binding.body);
    this.callStack.pop();
  }

  executePrint(statement) {
    const output = this.executeStatement(statement.value);

    if (this.ifLogOutput) {
      console.log(output);
    }

    this.output.push(output);
  }
}

export default Interpreter;
