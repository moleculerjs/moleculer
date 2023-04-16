import type { EventEmitter2 } from "eventemitter2";

import ServiceBroker = require("./src/service-broker");
export { ServiceBroker };
export type { ServiceBrokerOptions } from "./src/service-broker";

import Service = require("./src/service");
export { Service };
export type {
	ServiceSchema,
	ServiceSettingSchema,
	ServiceAction,
	ServiceActions
} from "./src/service";

import Context = require("./src/context");
export { Context };

export * as Loggers from "./src/loggers";
export type { LogLevels } from "./src/loggers";
export type { Logger, LoggerConfig } from "./src/logger-factory";

export * as Cachers from "./src/cachers";

export * as Transporters from "./src/transporters";

export * as Serializers from "./src/serializers";

export * as Strategies from "./src/strategies";

export * as Validators from "./src/validators";
export type { ValidatorNames } from "./src/validators";

export * as TracerExporters from "./src/tracing/exporters";

export * as MetricTypes from "./src/metrics/types";

export * as MetricReporters from "./src/metrics/reporters";

import Transit = require("./src/transit");
export { Transit };

import Registry = require("./src/registry");
export { Registry };

export * as Discoverers from "./src/registry/discoverers";

export * as Errors from "./src/errors";

export * as Utils from "./src/utils";

export type {
	CIRCUIT_CLOSE,
	CIRCUIT_HALF_OPEN,
	CIRCUIT_HALF_OPEN_WAIT,
	CIRCUIT_OPEN
} from "./src/constants";

/**
 * Moleculer uses global.Promise as the default promise library
 * If you are using a third-party promise library (e.g. Bluebird), you will need to
 * assign type definitions to use for your promise library.  You will need to have a .d.ts file
 * with the following code when you compile:
 *
 * - import Bluebird from "bluebird";
 *   declare module "moleculer" {
 *     type Promise<T> = Bluebird<T>;
 *   }
 */

export type GenericObject = { [name: string]: any };

export interface LoggerBindings {
	nodeID: string;
	ns: string;
	mod: string;
	svc: string;
	ver: string | void;
}

export interface HotReloadOptions {
	modules?: string[];
}

export type CallMiddlewareHandler = (
	actionName: string,
	params: any,
	opts: CallingOptions
) => Promise<any>;
export type Middleware = {
	[name: string]:
		| ((handler: ActionHandler, action: ActionSchema) => any)
		| ((handler: ActionHandler, event: ServiceEvent) => any)
		| ((handler: ActionHandler) => any)
		| ((service: Service) => any)
		| ((broker: ServiceBroker) => any)
		| ((handler: CallMiddlewareHandler) => CallMiddlewareHandler);
};

export type MiddlewareInit = (broker: ServiceBroker) => Middleware;
export interface MiddlewareCallHandlerOptions {
	reverse?: boolean;
}

export interface MiddlewareHandler {
	list: Middleware[];

	add(mw: string | Middleware | MiddlewareInit): void;
	wrapHandler(method: string, handler: ActionHandler, def: ActionSchema): typeof handler;
	callHandlers(method: string, args: any[], opts: MiddlewareCallHandlerOptions): Promise<void>;
	callSyncHandlers(method: string, args: any[], opts: MiddlewareCallHandlerOptions): void;
	count(): number;
	wrapMethod(
		method: string,
		handler: ActionHandler,
		bindTo?: any,
		opts?: MiddlewareCallHandlerOptions
	): typeof handler;
}

export type CheckRetryable = (err: MoleculerError | Error) => boolean;

export interface RetryPolicyOptions {
	enabled?: boolean;
	retries?: number;
	delay?: number;
	maxDelay?: number;
	factor?: number;
	check?: CheckRetryable;
}

export interface RegistryDiscovererOptions {
	type: string;
	options: DiscovererOptions;
}

export interface DiscovererOptions extends GenericObject {
	heartbeatInterval?: number;
	heartbeatTimeout?: number;
	disableHeartbeatChecks?: boolean;
	disableOfflineNodeRemoving?: boolean;
	cleanOfflineNodesTimeout?: number;
}

export interface BrokerTransitOptions {
	maxQueueSize?: number;
	disableReconnect?: boolean;
	disableVersionCheck?: boolean;
	maxChunkSize?: number;
}

export interface BrokerTrackingOptions {
	enabled?: boolean;
	shutdownTimeout?: number;
}

export interface LogLevelConfig {
	[module: string]: boolean | LogLevels;
}

export interface NodeHealthStatus {
	cpu: {
		load1: number;
		load5: number;
		load15: number;
		cores: number;
		utilization: number;
	};
	mem: {
		free: number;
		total: number;
		percent: number;
	};
	os: {
		uptime: number;
		type: string;
		release: string;
		hostname: string;
		arch: string;
		platform: string;
		user: string;
	};
	process: {
		pid: NodeJS.Process["pid"];
		memory: NodeJS.MemoryUsage;
		uptime: number;
		argv: string[];
	};
	client: {
		type: string;
		version: string;
		langVersion: NodeJS.Process["version"];
	};
	net: {
		ip: string[];
	};
	time: {
		now: number;
		iso: string;
		utc: string;
	};
}

export interface ContextParentSpan {
	id: string;
	traceID: string;
	sampled: boolean;
}

export interface MCallCallingOptions extends CallingOptions {
	settled?: boolean;
}

export interface CallDefinition<P extends GenericObject = GenericObject> {
	action: string;
	params: P;
}

export interface MCallDefinition<P extends GenericObject = GenericObject>
	extends CallDefinition<P> {
	options?: CallingOptions;
}

export interface ActionEndpoint extends Endpoint {
	service: Service;
	action: ActionSchema;
}

export interface EventEndpoint extends Endpoint {
	service: Service;
	event: EventSchema;
}

export declare const MOLECULER_VERSION: string;
export declare const PROTOCOL_VERSION: string;
export declare const INTERNAL_MIDDLEWARES: string[];

export declare const METRIC: {
	TYPE_COUNTER: "counter";
	TYPE_GAUGE: "gauge";
	TYPE_HISTOGRAM: "histogram";
	TYPE_INFO: "info";
};
