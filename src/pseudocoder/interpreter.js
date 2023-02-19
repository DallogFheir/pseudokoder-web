import Parser from "./parser.js";
import { RuntimeError, BuiltinFunctionError, InternalError } from "./errors.js";

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
    if (rightOperand === null) {
      throw new RuntimeError(
        `Funkcja ${statement.rightOperand.identifier.symbol} nic nie zwraca.`,
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

    if (executedStatement === undefined) {
      throw new RuntimeError(
        `Funkcja ${statement.value.identifier.symbol} nic nie zwraca.`,
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

export default Interpreter;
