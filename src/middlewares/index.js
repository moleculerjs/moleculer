/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Middlewares = {
	ActionHook: require("./action-hook"),
	Cacher: require("./cacher"),
	Validator: require("./validator"),
	Bulkhead: require("./bulkhead"),
	ContextTracker: require("./context-tracker"),
	CircuitBreaker: require("./circuit-breaker"),
	Timeout: require("./timeout"),
	Retry: require("./retry"),
	Fallback: require("./fallback"),
	ErrorHandler: require("./error-handler"),
	Metrics: require("./metrics"),
	Tracing: require("./tracing"),

	Debounce: require("./debounce"),
	Throttle: require("./throttle"),

	HotReload: require("./hot-reload"),

	Transmit: {
		Encryption: require("./transmit/encryption"),
		Compression: require("./transmit/compression")
	},

	Debugging: {
		TransitLogger: require("./debugging/transit-logger"),
		ActionLogger: require("./debugging/action-logger")
	}
};

function register(name, value) {
	Middlewares[name] = value;
}

module.exports = Object.assign(Middlewares, { register });
