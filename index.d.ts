// --- SERVICE BROKER ---

import ServiceBroker = require("./src/service-broker");
export { ServiceBroker };
export type { BrokerOptions, CallingOptions } from "./src/service-broker";

// --- SERVICE ---

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

// --- CONTEXT ---

import Context = require("./src/context");
export { Context };

// --- TRANSIT ---

import Transit = require("./src/transit");
export { Transit };
export * as Packet from "./src/packets";

// --- RUNNER ---

import Runner = require("./src/runner");
export { Runner };
export type { RunnerFlags } from "./src/runner";

// --- ERRORS ---

export * as Errors from "./src/errors";

// --- UTILS ---

export * as Utils from "./src/utils";

// --- CONSTANTS ---

export type {
	CIRCUIT_CLOSE,
	CIRCUIT_HALF_OPEN,
	CIRCUIT_HALF_OPEN_WAIT,
	CIRCUIT_OPEN
} from "./src/constants";

export declare const MOLECULER_VERSION: string;
export declare const PROTOCOL_VERSION: string;
export declare const INTERNAL_MIDDLEWARES: string[];

// --- CACHERS ---

export * as Cachers from "./src/cachers";

// --- LOGGERS ---

export * as Loggers from "./src/loggers";
export type { LogLevels } from "./src/loggers";
export type { Logger, LoggerConfig } from "./src/logger-factory";

// --- METRICS ---

export * as MetricTypes from "./src/metrics/types";
export * as MetricReporters from "./src/metrics/reporters";
import MetricRegistry = require("./src/metrics/registry");
export { MetricRegistry };
export * as METRIC from "./src/metrics/constants";

// --- MIDDLEWARES ---

export type { CallMiddlewareHandler, Middleware } from "./src/middleware";

// --- SERVICE REGISTRY ---

import Registry = require("./src/registry");
export { Registry };

import type EndpointList = require("./src/registry/endpoint-list");
export type { EndpointList };
import type Endpoint = require("./src/registry/endpoint");
export type { Endpoint };
import type ActionEndpoint = require("./src/registry/endpoint-action");
export type { ActionEndpoint };
import type EventEndpoint = require("./src/registry/endpoint-event");
import { Packet } from "./src/packets";
export type { EventEndpoint };

export * as Discoverers from "./src/registry/discoverers";

// --- SERIALIZERS ---

export * as Serializers from "./src/serializers";

// --- STRATEGIES ---

export * as Strategies from "./src/strategies";

// --- TRACING ---

export type { Tracer, Span, TracerOptions } from "./src/tracing";
export * as TracerExporters from "./src/tracing/exporters";

// --- TRANSPORTERS ---

export * as Transporters from "./src/transporters";

// --- VALIDATORS ---

export * as Validators from "./src/validators";
export type { ValidatorNames } from "./src/validators";
