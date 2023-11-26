import LoggerFactory = require("../logger-factory");
import ServiceBroker = require("../service-broker");

declare namespace BaseLogger {
	export type LEVELS = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	export type LogHandler = (level: LEVELS, args: unknown[]) => void;

	export interface LoggerOptions {
		level?: LEVELS;
		createLogger?: Function
	}
}

declare abstract class BaseLogger {
	constructor(opts?: BaseLogger.LoggerOptions);

    loggerFactory: LoggerFactory;
    broker: ServiceBroker;

	opts: BaseLogger.LoggerOptions

	init(loggerFactory: LoggerFactory): void;

	stop(): void;

	getLogLevel(mod: string): BaseLogger.LEVELS | null;

	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;

	static LEVELS: string[]; // BaseLogger.LEVELS;
}

export = BaseLogger;
