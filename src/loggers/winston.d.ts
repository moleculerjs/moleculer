import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

declare namespace WinstonLogger {

	export interface WinstonLoggerOptions extends LoggerOptions {
		winston: {
			level?: string,
			[key: string]: any
		}
	}
}

declare class WinstonLogger extends BaseLogger<WinstonLogger.WinstonLoggerOptions> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = WinstonLogger;
