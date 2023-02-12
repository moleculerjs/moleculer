import type ServiceBroker = require("./service-broker");
import type { LogLevels } from "./loggers";

declare namespace LoggerFactory {
	export interface LoggerConfig {
		type: string;
		options?: Record<string, any>;
	}

	export type Logger = {
		[level in LogLevels]: (...args: any[]) => void;
	};
}

declare class LoggerFactory {
	broker: ServiceBroker;

	constructor(broker: ServiceBroker);

	init(opts: LoggerFactory.LoggerConfig | LoggerFactory.LoggerConfig[]): void;

	stop(): void;

	getLogger(bindings: Record<string, any>): LoggerFactory.Logger;

	getBindingsKey(bindings: Record<string, any>): String;
}
export = LoggerFactory;
