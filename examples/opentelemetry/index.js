/* eslint-disable no-console */

"use strict";

// Instead use `-r ./tracing.js` // require("./tracing");

const path = require("path");

const ServiceBroker = require("../../src/service-broker");
const { api } = require("@opentelemetry/sdk-node");

const brokerOpts = {
	logger: console,
	logLevel: "info",
	transporter: "Redis",
	//cacher: "Redis",

	// Ddisable built-in metrics.
	metrics: {
		enabled: false
	},

	// Disable built-in tracing.
	tracing: {
		enabled: false
	},

	internalMiddlewares: false,

	// Register custom middlewares
	middlewares: [
		"ActionHook",
		"Validator",
		"Bulkhead",
		"Cacher",
		"ContextTracker",
		"CircuitBreaker",
		"Timeout",
		"Retry",
		"Fallback",
		"ErrorHandler",
		require("./opentelemetry.middleware"),
		"Metrics",
		"Debounce",
		"Throttle"
	]
};

// Create broker
const broker = new ServiceBroker({
	nodeID: "otel-1",
	...brokerOpts
});

const broker2 = new ServiceBroker({
	nodeID: "otel-2",
	...brokerOpts
});

broker2.loadService(path.join(__dirname, "..", "post.service.js"));
broker2.loadService(path.join(__dirname, "..", "user.service.js"));

Promise.all([broker.start(), broker2.start()]).then(async () => {
	await broker.waitForServices("posts");

	const tracer = api.trace.getTracer("moleculer-otel");

	setInterval(async () => {
		tracer.startActiveSpan("doWork", async span => {
			console.log("Dowork...");
			await broker.call("posts.get", { id: 3 });

			span.end();
		});
	}, 2500);
});
