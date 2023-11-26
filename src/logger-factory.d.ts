import type ServiceBroker = require("./service-broker");
import type { LogLevels, Base as BaseLogger } from "./loggers";

declare namespace LoggerFactory {
	export interface LoggerBindings {
		nodeID: string;
		ns: string;
		mod: string;
		svc: string;
		ver?: string;
	}

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

	init(opts: null | boolean | LoggerFactory.LoggerConfig | LoggerFactory.LoggerConfig[]): void;

	stop(): void;

	getLogger(bindings: LoggerFactory.LoggerBindings): BaseLogger;

	getBindingsKey(bindings: LoggerFactory.LoggerBindings): string;
}
export = LoggerFactory;
