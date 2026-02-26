type Level = "INFO" | "WARN" | "ERROR";

function log(level: Level, category: string, message: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${category} ${message}`);
}

export const logger = {
  info: (category: string, message: string) => log("INFO", category, message),
  warn: (category: string, message: string) => log("WARN", category, message),
  error: (category: string, message: string) => log("ERROR", category, message),
};
