"use strict";

const asyncHooks = require("async_hooks");

const ServiceBroker = require("../src/service-broker");

const { MoleculerError } 	= require("../src/errors");
const _ 					= require("lodash");
const { inspect }			= require("util");

const THROW_ERR = false;

// Create broker
const broker = new ServiceBroker({
	nodeID: "node-1",
	logLevel: "info",

	tracing: {
		actions: true,
		events: true,
		exporter: [
			{
				type: "Console",
				options: {
					width: 100,
					gaugeWidth: 30,
					logger: console.info
				}
			},
		]
	}
});

const schema = {
	events: {
		"user.created"(ctx) {
			this.logger.info("Event received");
		}
	}
};

broker.createService({ name: "svc-1" }, schema);
broker.createService({ name: "svc-2" }, schema);
broker.createService({ name: "svc-3" }, schema);
broker.createService({ name: "svc-4" }, schema);


// Start server
broker.start().then(async () => {
	broker.repl();

	await broker.Promise.delay(2000);

	const mainSpan = broker.tracer.startSpan("main");

	const span = broker.tracer.startSpan("send events", { parentSpan: mainSpan });

	broker.broadcast("user.created", null, { parentSpan: span });

	await broker.Promise.delay(20);

	span.finish();

	mainSpan.finish();

});
