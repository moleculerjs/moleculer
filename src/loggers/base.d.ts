import LoggerFactory = require("../logger-factory");
import ServiceBroker = require("../service-broker");

declare namespace BaseLogger {
	export type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	export type LogHandler = (level: LogLevels, args: unknown[]) => void;

	export interface LoggerOptions {
		level?: LogLevels;
		createLogger?: Function;
	}

	// export const BaseLogger;
}

declare abstract class BaseLogger<TOptions extends BaseLogger.LoggerOptions> {

	loggerFactory: LoggerFactory;
	broker: ServiceBroker;

	opts: TOptions;

	constructor(opts?: TOptions);
	init(loggerFactory: LoggerFactory): void;

	stop(): void;

	getLogLevel(mod: string): BaseLogger.LogLevels | null;

	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;

	static LEVELS: string[]; // BaseLogger.LEVELS;
}

export = BaseLogger;
