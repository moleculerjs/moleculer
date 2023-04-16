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

export interface LoggerBindings {
	nodeID: string;
	ns: string;
	mod: string;
	svc: string;
	ver: string | void;
}

export interface RegistryDiscovererOptions {
	type: string;
	options: DiscovererOptions;
}

export interface DiscovererOptions extends Record<string, any> {
	heartbeatInterval?: number;
	heartbeatTimeout?: number;
	disableHeartbeatChecks?: boolean;
	disableOfflineNodeRemoving?: boolean;
	cleanOfflineNodesTimeout?: number;
}

export interface ContextParentSpan {
	id: string;
	traceID: string;
	sampled: boolean;
}

export interface MCallCallingOptions extends CallingOptions {
	settled?: boolean;
}

export interface CallDefinition<P extends Record<string, any> = Record<string, any>> {
	action: string;
	params: P;
}

export interface MCallDefinition<P extends Record<string, any> = Record<string, any>>
	extends CallDefinition<P> {
	options?: CallingOptions;
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
