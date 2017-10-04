/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "dep-" + process.pid,
	transporter: "NATS",
	logger: console,
	//logLevel: "debug",
	//hotReload: true
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			this.logger.info("Call add...");
			return this.calc(ctx.params.a, ctx.params.b);
		}
	},
	started() {
		this.logger.info("Starting service...");
		return this.Promise.delay(5000).then(() => {
			this.calc = (a, b) => Number(a) + Number(b);

			this.logger.info("Service started!");
		});
	}
});
/*
broker.createService({
	name: "test",
	version: 2,
	dependencies: ["dep-test"],
	started() {
		this.logger.info("!!! SERVICE STARTED !!!");
	}
});*/

broker.start().then(() => {
	broker.logger.info("!!! BROKER STARTED !!!");

	//broker.repl();
});
