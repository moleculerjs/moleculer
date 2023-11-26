import { override } from "joi";
import LoggerFactory = require("../logger-factory");

import type { LogHandler } from "./base";
import FormattedLogger = require("./formatted");
import type { FormattedLoggerOptions } from "./formatted";

declare namespace FileLogger {

	export interface FileLoggerOptions extends FormattedLoggerOptions {
		folder?: string,
		filename?: string,
		eol?: string,
		interval?: number
	}
}

declare class FileLogger extends FormattedLogger {
	constructor(opts?: FileLogger.FileLoggerOptions);

	opts: FileLogger.FileLoggerOptions;

	stop(): void;
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): LogHandler | null;
}

export = FileLogger;
