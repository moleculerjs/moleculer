import LoggerFactory = require("../logger-factory");

import type { LogHandler } from "./base";
import FormattedLogger = require("./formatted");
import type { FormattedLoggerOptions } from "./formatted";

declare namespace ConsoleLogger {

	export interface ConsoleLoggerOptions extends FormattedLoggerOptions {}
}

declare class ConsoleLogger extends FormattedLogger<ConsoleLogger.ConsoleLoggerOptions> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): LogHandler | null;
}

export = ConsoleLogger;
