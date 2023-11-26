import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

declare namespace BunyanLogger {

	export interface BunyanLoggerOptions extends LoggerOptions {
		bunyan?: {
			name?: string,
			[key: string]: any
		}
	}
}

declare class BunyanLogger extends BaseLogger {
	constructor(opts?: BunyanLogger.BunyanLoggerOptions);

	opts: BunyanLogger.BunyanLoggerOptions;

	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = BunyanLogger;
