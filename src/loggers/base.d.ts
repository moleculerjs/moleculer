import LoggerFactory = require("../logger-factory");
import ServiceBroker = require("../service-broker");

declare namespace BaseLogger {
	export type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	export type LogHandler = (level: LogLevels, args: unknown[]) => void;

	export interface LoggerOptions {
		level?: LogLevels;
		createLogger?: Function
	}
}

declare abstract class BaseLogger {
	constructor(opts?: BaseLogger.LoggerOptions);

    loggerFactory: LoggerFactory;
    broker: ServiceBroker;

	// opts: BaseLogger.LoggerOptions

	init(loggerFactory: LoggerFactory): void;

	stop(): void;

	getLogLevel(mod: string): BaseLogger.LogLevels | null;

	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;

	static LEVELS: string[]; // BaseLogger.LEVELS;
}

export = BaseLogger;
