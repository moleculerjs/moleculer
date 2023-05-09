import LoggerFactory = require("../logger-factory");

declare namespace BaseLogger {
	export type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	export type LogHandler = (level: LogLevels, args: unknown[]) => void;

	export interface LoggerOptions {
		level?: LogLevels;
	}
}

declare abstract class BaseLogger {
	constructor(opts?: BaseLogger.LoggerOptions);

	init(loggerFactory: LoggerFactory): void;

	stop(): void;

	getLogLevel(mod: string): BaseLogger.LogLevels | null;

	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}
export = BaseLogger;
