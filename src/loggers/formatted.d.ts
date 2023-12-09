import LoggerFactory = require("../logger-factory");

import BaseLogger = require("./base");
import type { LoggerOptions } from "./base";

declare namespace FormattedLogger {
	export type FormatterFunction = (type: string, args: any[]) => string[];

	export interface FormattedLoggerOptions extends LoggerOptions {
		colors?: boolean;
		moduleColors?: boolean | string[];
		formatter?: FormatterFunction | "json" | "jsonext" | "simple" | "short" | "full";
		objectPrinter?: (obj: any) => string;
		autoPadding?: boolean;
	}
}

declare class FormattedLogger<
	T extends FormattedLogger.FormattedLoggerOptions
> extends BaseLogger<T> {
	init(loggerFactory: LoggerFactory): void;
	getLogHandler(bindings: LoggerFactory.LoggerBindings): BaseLogger.LogHandler | null;
	getFormatter(bindings: LoggerFactory.LoggerBindings): FormattedLogger.FormatterFunction;
	render(str: string, obj: Record<string, any>): string;
}

export = FormattedLogger;
