import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

declare namespace DatadogLogger {
	export interface DatadogLoggerOptions extends LoggerOptions {
		url?: string;
		apiKey?: string;
		ddSource?: string;
		env?: string;
		hostname?: string;
		objectPrinter?: (obj: any) => string;
		interval?: number;
	}
}

declare class DatadogLogger extends BaseLogger<DatadogLogger.DatadogLoggerOptions> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = DatadogLogger;
