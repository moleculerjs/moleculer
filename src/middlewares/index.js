/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	ActionHook: require("./action-hook"),
	CircuitBreaker: require("./circuit-breaker"),
	Metrics: require("./metrics"),
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

	/*Debugging: {
		TransmitLogger: require("./debugging/transmit-logger"),
		ActionLogger: require("./debugging/action-logger"),
	}*/
};
