"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "dep2",
	transporter: {
		type: "NATS",
		options: {
			//debug: true
		}
	},
	logger: console,
	//internalServices: false,
	//logLevel: "debug",
	//hotReload: true
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			this.logger.info("Adding...");
			return this.calc(ctx.params.a, ctx.params.b);
		}
	},
	started() {
		this.logger.info("Starting service...");
		return this.Promise.delay(5000).then(() => {
			this.calc = (a, b) => Number(a) + Number(b);

			this.logger.info("Service started!");
		});
	},
	stopped() {
		this.logger.info("Stopping service...");
		this.calc = null;
		return this.Promise.delay(10 * 1000).then(() => {

			this.logger.info("Service stopped!");
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

	setTimeout(() => broker.stop(), 10 * 1000);
});
