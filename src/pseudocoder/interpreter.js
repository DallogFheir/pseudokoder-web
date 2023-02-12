import Parser from "./parser.js";
import { RuntimeError, InternalError } from "./errors.js";

class Interpreter {
  execute(code, startingBindings = {}, firstIndex = 1) {
    this.bindings = { ...startingBindings };
    this.firstIndex = firstIndex;
    this.output = [];

    const parser = new Parser();
    const ast = parser.parse(code);

    for (const statement of ast.body.statements) {
      this.executeStatement(statement);
    }

    return this.output
      .map((el) => {
        if (Array.isArray(el)) {
          return `[${el.join(", ")}]`;
        }

        return el;
      })
      .join("\n");
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
      case "PrintStatement":
        this.executePrint(statement);
        break;
      default:
        throw new InternalError(`Nieznany typ polecenia: ${statement.type}.`);
    }
  }

  executeIdentifier(statement) {
    if (!(statement.symbol in this.bindings)) {
      throw new RuntimeError(
        `Nieznana zmienna: ${statement.symbol}.`,
        statement.position
      );
    }

    return this.bindings[statement.symbol];
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
        const result = this.executeStatement(statement.operand)[index];

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
    if (statement.identifier.type === "ArrayIdentifier") {
      this.bindings[statement.identifier.symbol][
        this.executeStatement(statement.identifier.index) - this.firstIndex
      ] = this.executeStatement(statement.rightOperand);
    } else if (statement.identifier.type === "Identifier") {
      this.bindings[statement.identifier.symbol] = this.executeStatement(
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
    }
  }

  executePrint(statement) {
    this.output.push(this.executeStatement(statement.value));
  }
}

export default Interpreter;
