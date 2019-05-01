/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Middlewares = {
	ActionHook: require("./action-hook"),
	CircuitBreaker: require("./circuit-breaker"),
	Metrics: require("./metrics"),
	Tracing: require("./tracing"),
	Retry: require("./retry"),
	Timeout: require("./timeout"),
	ContextTracker: require("./context-tracker"),
	Bulkhead: require("./bulkhead"),
	Fallback: require("./fallback"),
	ErrorHandler: require("./error-handler"),

	HotReload: require("./hot-reload"),

	Transmit: {
		Encryption: require("./transmit/encryption"),
		Compression: require("./transmit/compression")
	},

	Debugging: {
		TransitLogger: require("./debugging/transit-logger"),
		ActionLogger: require("./debugging/action-logger"),
	}
};

module.exports = Middlewares;
