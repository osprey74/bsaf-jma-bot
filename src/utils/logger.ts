type Level = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_PRIORITY: Record<Level, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/** Arbitrary key-value context attached to a log entry. */
interface LogContext {
  /** Error instance — stack will be extracted automatically. */
  error?: unknown;
  /** Raw input data (XML snippet, content text). Truncated automatically. */
  input?: string;
  [key: string]: unknown;
}

const MAX_INPUT_SNIPPET = 500;

const LOG_LEVEL: Level = (() => {
  const env = (process.env.LOG_LEVEL ?? "INFO").toUpperCase();
  if (env in LEVEL_PRIORITY) return env as Level;
  return "INFO";
})();

const LOG_JSON: boolean = (() => {
  const env = process.env.LOG_FORMAT?.toLowerCase();
  if (env === "json") return true;
  if (env === "text") return false;
  return process.env.NODE_ENV === "production";
})();

function shouldLog(level: Level): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `...[truncated, ${s.length} chars total]`;
}

function extractError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function log(level: Level, category: string, message: string, ctx?: LogContext): void {
  if (!shouldLog(level)) return;

  const ts = new Date().toISOString();

  if (LOG_JSON) {
    const entry: Record<string, unknown> = {
      time: ts,
      level,
      category,
      msg: message,
    };

    if (ctx) {
      if (ctx.error !== undefined) {
        const { message: errMsg, stack } = extractError(ctx.error);
        entry.error = errMsg;
        if (stack) entry.stack = stack;
      }
      if (ctx.input !== undefined) {
        entry.input = truncate(String(ctx.input), MAX_INPUT_SNIPPET);
      }
      for (const [k, v] of Object.entries(ctx)) {
        if (k === "error" || k === "input") continue;
        entry[k] = v;
      }
    }

    console.log(JSON.stringify(entry));
  } else {
    let line = `[${ts}] [${level}] ${category} ${message}`;
    if (ctx) {
      if (ctx.error !== undefined) {
        const { message: errMsg, stack } = extractError(ctx.error);
        line += `\n  error: ${errMsg}`;
        if (stack) line += `\n  ${stack}`;
      }
      if (ctx.input !== undefined) {
        line += `\n  input: ${truncate(String(ctx.input), MAX_INPUT_SNIPPET)}`;
      }
      for (const [k, v] of Object.entries(ctx)) {
        if (k === "error" || k === "input") continue;
        line += `\n  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`;
      }
    }
    console.log(line);
  }
}

export const logger = {
  debug: (category: string, message: string, ctx?: LogContext) =>
    log("DEBUG", category, message, ctx),
  info: (category: string, message: string, ctx?: LogContext) =>
    log("INFO", category, message, ctx),
  warn: (category: string, message: string, ctx?: LogContext) =>
    log("WARN", category, message, ctx),
  error: (category: string, message: string, ctx?: LogContext) =>
    log("ERROR", category, message, ctx),
};
