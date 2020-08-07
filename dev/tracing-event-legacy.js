"use strict";

const ServiceBroker = require("../src/service-broker");

// Create broker
const broker = new ServiceBroker({
	nodeID: "node-1",
	logLevel: "info",

	tracing: {
		exporter: ["Event", "EventLegacy"],
		defaultTags: tracer => ({
			namespace: tracer.broker.namespace
		})
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			metrics: {
				params: ["name"],
				meta: true
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.createService({
	name: "event-catcher",

	events: {
		"metrics.trace.span.start"(ctx) {
			this.logger.info("metrics.trace.span.start", ctx.params);
		},
		"metrics.trace.span.finish"(ctx) {
			this.logger.info("metrics.trace.span.finish", ctx.params);
		},
		"$tracing.spans"(ctx) {
			this.logger.info("$tracing.spans", ctx.params);
		}
	}
});


// Start server
broker.start().then(async () => {
	broker.repl();

	broker.call("greeter.hello", { name: "Moleculer" }, { meta: { user: "John" } });
});
