import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

import type { LoggerOptions as BunyanNativeLoggerOptions } from "bunyan";

declare namespace BunyanLogger {

	export interface BunyanLoggerOptions extends LoggerOptions {
		bunyan?: BunyanNativeLoggerOptions
	}
}

declare class BunyanLogger extends BaseLogger<BunyanLogger.BunyanLoggerOptions> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = BunyanLogger;
