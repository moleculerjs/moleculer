import type ServiceBroker = require("./service-broker");
import type { LogLevels } from "./loggers";

export interface LoggerConfig {
	type: string;
	options?: Record<string, any>;
}

export type Logger = {
	[level in LogLevels]: (...args: any[]) => void;
};

declare class LoggerFactory {
	broker: ServiceBroker;

	constructor(broker: ServiceBroker);

	init(opts: LoggerConfig | LoggerConfig[]): void;

	stop(): void;

	getLogger(bindings: Record<string, any>): Logger;

	getBindingsKey(bindings: Record<string, any>): String;
}
export = LoggerFactory;
