import LoggerFactory = require("../logger-factory");

declare namespace BaseLogger {
	export type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	export interface LoggerOptions {
		level?: LogLevels;
	}
}

declare abstract class BaseLogger {
	constructor(opts?: BaseLogger.LoggerOptions);

	init(loggerFactory: LoggerFactory): void;

	stop(): void;

	getLogLevel(mod: string): string;

	getLogHandler(bindings: Record<string, any>): Record<string, any>;
}
export = BaseLogger;
