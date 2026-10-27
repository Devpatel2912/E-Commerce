import pino from "pino";
import config from "./env.js";

const isProduction = config.isProduction;
const logLevel = isProduction ? "info" : "debug";

export const baseLogger = pino({
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

const formatArgs = (args) => {
  if (args.length === 0) return [];
  if (args.length === 1) {
    const [first] = args;
    if (first instanceof Error) {
      return [{ err: first }, first.message];
    }
    return [first];
  }

  const [first, second, ...rest] = args;
  if (typeof first === "string") {
    if (second instanceof Error) {
      const extraMsg =
        rest.length > 0
          ? " " +
            rest
              .map((r) => (typeof r === "object" ? JSON.stringify(r) : r))
              .join(" ")
          : "";
      return [{ err: second }, first + extraMsg];
    }

    if (typeof second === "object" && second !== null) {
      const extraMsg =
        rest.length > 0
          ? " " +
            rest
              .map((r) => (typeof r === "object" ? JSON.stringify(r) : r))
              .join(" ")
          : "";
      return [second, first + extraMsg];
    }

    if (!/%[sdjifoOc%]/.test(first)) {
      return [
        [first, second, ...rest]
          .map((r) => (typeof r === "object" ? JSON.stringify(r) : r))
          .join(" "),
      ];
    }

    return args;
  }

  return args;
};

const createWrappedLogger = (pinoInstance) => ({
  ...pinoInstance,
  debug: (...args) => pinoInstance.debug(...formatArgs(args)),
  info: (...args) => pinoInstance.info(...formatArgs(args)),
  warn: (...args) => pinoInstance.warn(...formatArgs(args)),
  error: (...args) => pinoInstance.error(...formatArgs(args)),
  child: (bindings, options) =>
    createWrappedLogger(pinoInstance.child(bindings, options)),
});

export const logger = createWrappedLogger(baseLogger);

export default logger;
