import { DestinationStream } from "pino";
import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

declare namespace PinoLogger {
	export interface PinoLoggerOptions extends LoggerOptions {
		pino?: {
			options: Record<string, any>;
			destination: DestinationStream;
		};
	}
}

declare class PinoLogger extends BaseLogger<PinoLogger.PinoLoggerOptions> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
}

export = PinoLogger;
