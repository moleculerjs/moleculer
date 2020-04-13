/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const {
	CIRCUIT_CLOSE,
	CIRCUIT_HALF_OPEN,
	CIRCUIT_HALF_OPEN_WAIT,
	CIRCUIT_OPEN
} = require("./src/constants");

module.exports = {
	ServiceBroker: require("./src/service-broker"),
	Loggers: require("./src/loggers"),
	Service: require("./src/service"),
	Context: require("./src/context"),

	Cachers: require("./src/cachers"),

	Transporters: require("./src/transporters"),
	Serializers: require("./src/serializers"),
	Strategies: require("./src/strategies"),
	Validator: require("./src/validator"),
	TracerExporters: require("./src/tracing/exporters"),
	MetricTypes: require("./src/metrics/types"),
	MetricReporters: require("./src/metrics/reporters"),
	METRIC: require("./src/metrics/constants"),

	Registry: require("./src/registry"),
	Discoverers: require("./src/registry/discoverers"),

	Middlewares: require("./src/middlewares"),

	Errors: require("./src/errors"),

	Runner: require("./src/runner"),
	Utils: require("./src/utils"),

	CIRCUIT_CLOSE,
	CIRCUIT_HALF_OPEN,
	CIRCUIT_HALF_OPEN_WAIT,
	CIRCUIT_OPEN,

	MOLECULER_VERSION: require("./src/service-broker").MOLECULER_VERSION,
	PROTOCOL_VERSION: require("./src/service-broker").PROTOCOL_VERSION
};
