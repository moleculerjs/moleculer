import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

declare namespace DebugLogger {

	export interface DebugLoggerOptions extends LoggerOptions {}
}

declare class DebugLogger extends BaseLogger<DebugLogger.DebugLoggerOptions> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = DebugLogger;
