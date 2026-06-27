import fs from "node:fs";
import path from "node:path";
import { redactText } from "./redaction.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const levelColors: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m"
};

const reset = "\x1b[0m";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  runId: string;
  scenarioId?: string;
  message: string;
}

export interface LoggerOptions {
  runId: string;
  scenarioId?: string;
  level?: LogLevel;
  secrets?: string[];
  logDir?: string;
  silent?: boolean;
}

export class Logger {
  private readonly runId: string;
  private readonly scenarioId: string | undefined;
  private readonly minLevel: number;
  private readonly secrets: string[];
  private readonly logPath: string | undefined;
  private readonly silent: boolean;

  constructor(options: LoggerOptions) {
    this.runId = options.runId;
    this.scenarioId = options.scenarioId;
    this.minLevel = levelPriority[options.level ?? "info"];
    this.secrets = options.secrets ?? [];
    this.silent = options.silent ?? false;

    if (options.logDir) {
      fs.mkdirSync(options.logDir, { recursive: true });
      this.logPath = path.join(options.logDir, `${options.runId}.log`);
    }
  }

  child(scenarioId: string): Logger {
    const opts: LoggerOptions = {
      runId: this.runId,
      scenarioId,
      level: this.levelName(),
      secrets: this.secrets,
      silent: this.silent
    };
    if (this.logPath) opts.logDir = path.dirname(this.logPath);
    return new Logger(opts);
  }

  debug(message: string): void {
    this.log("debug", message);
  }

  info(message: string): void {
    this.log("info", message);
  }

  warn(message: string): void {
    this.log("warn", message);
  }

  error(message: string): void {
    this.log("error", message);
  }

  private log(level: LogLevel, rawMessage: string): void {
    if (levelPriority[level] < this.minLevel) return;

    const message = redactText(rawMessage, this.secrets);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      runId: this.runId,
      ...(this.scenarioId ? { scenarioId: this.scenarioId } : {}),
      message
    };

    if (!this.silent) {
      const color = levelColors[level];
      const scope = this.scenarioId ? ` [${this.scenarioId}]` : "";
      process.stderr.write(
        `${color}${entry.timestamp} ${level.toUpperCase().padEnd(5)}${reset} [${this.runId}]${scope} ${message}\n`
      );
    }

    if (this.logPath) {
      fs.appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`);
    }
  }

  private levelName(): LogLevel {
    const entries = Object.entries(levelPriority) as Array<[LogLevel, number]>;
    return entries.find(([, priority]) => priority === this.minLevel)?.[0] ?? "info";
  }
}

export function createRunLogger(
  runId: string,
  secrets: string[] = [],
  options: { level?: LogLevel; silent?: boolean } = {}
): Logger {
  return new Logger({
    runId,
    secrets,
    level: options.level ?? "info",
    logDir: path.join(process.cwd(), "artifacts", "logs"),
    silent: options.silent ?? false
  });
}
