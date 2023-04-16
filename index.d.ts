import type { EventEmitter2 } from "eventemitter2";

import ServiceBroker = require("./src/service-broker");
export { ServiceBroker };
export type { ServiceBrokerOptions, CallingOptions } from "./src/service-broker";

import Service = require("./src/service");
export { Service };
export type {
	ActionHooks,
	ActionHandler,
	ActionParams,
	ActionVisibility,
	ServiceHooks,
	ServiceHooksAfter,
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
export type { RedisCacherOptions } from "./src/cachers";

export * as Transporters from "./src/transporters";

export * as Serializers from "./src/serializers";

export * as Strategies from "./src/strategies";

export * as Validators from "./src/validators";
export type { ValidatorNames } from "./src/validators";

export type { Span, TracerOptions } from "./src/tracing";
export * as TracerExporters from "./src/tracing/exporters";

export * as MetricTypes from "./src/metrics/types";

export * as MetricReporters from "./src/metrics/reporters";

export * as METRIC from "./src/metrics/constants";

import Transit = require("./src/transit");
export { Transit };

import Registry = require("./src/registry");
export { Registry };

import type Endpoint = require("./src/registry/endpoint");
export type { Endpoint };

export * as Discoverers from "./src/registry/discoverers";

export * as Errors from "./src/errors";

export * as Utils from "./src/utils";

export type {
	CIRCUIT_CLOSE,
	CIRCUIT_HALF_OPEN,
	CIRCUIT_HALF_OPEN_WAIT,
	CIRCUIT_OPEN
} from "./src/constants";

export declare const MOLECULER_VERSION: string;
export declare const PROTOCOL_VERSION: string;
export declare const INTERNAL_MIDDLEWARES: string[];

// Below this point are type exports which are part of modules not exported as part of the main index.js file

export type { CallMiddlewareHandler, Middleware } from "./src/middleware";

import type ActionEndpoint = require("./src/registry/endpoint-action");
export type { ActionEndpoint };
