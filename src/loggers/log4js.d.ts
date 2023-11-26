import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";
import type { Configuration } from "log4js";

declare namespace Log4jsLogger {

	export interface Log4jsLoggerOptions extends LoggerOptions {
		log4js?: Configuration
	}
}

declare class Log4jsLogger extends BaseLogger {
	constructor(opts?: Log4jsLogger.Log4jsLoggerOptions);

	opts: Log4jsLogger.Log4jsLoggerOptions;

	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = Log4jsLogger;
