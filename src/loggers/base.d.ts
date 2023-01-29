import LoggerFactory from "../logger-factory";

export type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface LoggerOptions {
	level?: LogLevels;
}

declare abstract class Base {
	constructor(opts?: LoggerOptions);

	init(loggerFactory: LoggerFactory): void;

	stop(): void;

	getLogLevel(mod: string): string;

	getLogHandler(bindings: Record<string, any>): Record<string, any>;
}
export default Base;
