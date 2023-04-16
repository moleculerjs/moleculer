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

export * as METRIC from "./src/metrics/constants";

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

export declare const MOLECULER_VERSION: string;
export declare const PROTOCOL_VERSION: string;
export declare const INTERNAL_MIDDLEWARES: string[];
