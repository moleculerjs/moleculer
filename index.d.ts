// --- SERVICE BROKER ---

import ServiceBroker = require("./src/service-broker");
import type { BrokerOptions, CallingOptions } from "./src/service-broker";

// --- SERVICE ---

import Service = require("./src/service");
import type {
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

// --- TRANSIT ---

import Transit = require("./src/transit");
import * as Packet from "./src/packets";

// --- RUNNER ---

import Runner = require("./src/runner");
import type { RunnerFlags } from "./src/runner";

// --- ERRORS ---

import * as Errors from "./src/errors";

// --- UTILS ---

import * as Utils from "./src/utils";

// --- CONSTANTS ---

import type {
	CIRCUIT_CLOSE,
	CIRCUIT_HALF_OPEN,
	CIRCUIT_HALF_OPEN_WAIT,
	CIRCUIT_OPEN
} from "./src/constants";

// --- CACHERS ---

import * as Cachers from "./src/cachers";

// --- LOGGERS ---

import * as Loggers from "./src/loggers";
import type { LogLevels } from "./src/loggers";
import type { Logger, LoggerConfig } from "./src/logger-factory";

// --- METRICS ---

import * as MetricTypes from "./src/metrics/types";
import * as MetricReporters from "./src/metrics/reporters";
import MetricRegistry = require("./src/metrics/registry");
import * as METRIC from "./src/metrics/constants";

// --- MIDDLEWARES ---

import type { CallMiddlewareHandler, Middleware } from "./src/middleware";

// --- SERVICE REGISTRY ---

import Registry = require("./src/registry");

import type EndpointList = require("./src/registry/endpoint-list");
import type Endpoint = require("./src/registry/endpoint");
import type ActionEndpoint = require("./src/registry/endpoint-action");
import type EventEndpoint = require("./src/registry/endpoint-event");

import * as Discoverers from "./src/registry/discoverers";

// --- SERIALIZERS ---

import * as Serializers from "./src/serializers";

// --- STRATEGIES ---

import * as Strategies from "./src/strategies";

// --- TRACING ---

import type { Tracer, Span, TracerOptions } from "./src/tracing";
import * as TracerExporters from "./src/tracing/exporters";

// --- TRANSPORTERS ---

import * as Transporters from "./src/transporters";

// --- VALIDATORS ---

import * as Validators from "./src/validators";
import type { ValidatorNames } from "./src/validators";

declare namespace Moleculer {
	export { ServiceBroker, BrokerOptions, CallingOptions };

	export {
		Service,
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
	};

	export { Context };

	export { Transit, Packet };

	export { Runner, RunnerFlags };

	export { Errors };

	export { Utils };

	export { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_HALF_OPEN_WAIT, CIRCUIT_OPEN };

	export const MOLECULER_VERSION: string;
	export const PROTOCOL_VERSION: string;
	export const INTERNAL_MIDDLEWARES: string[];

	export { Cachers };

	export { Loggers, Logger, LoggerConfig, LogLevels };

	export { MetricTypes, MetricReporters, MetricRegistry, METRIC };

	export { CallMiddlewareHandler, Middleware };

	export { Registry, Discoverers, EndpointList, Endpoint, ActionEndpoint, EventEndpoint };

	export { Serializers };

	export { Strategies };

	export { Tracer, Span, TracerOptions, TracerExporters };

	export { Transporters };

	export { Validators, ValidatorNames };
}
