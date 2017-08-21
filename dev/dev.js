/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");

let broker1 = new ServiceBroker({
	nodeID: "node1",
	logger: true,
	logLevel: "debug",
	transporter: "NATS"
});

broker1.on("services.changed", (payload) => {
	console.log("Services changed!");
});

broker1.createService({
	name: "small-planets",
	events: {
		"planets.earth"(payload) {
			this.logger.info("Earth is fired!");
		},
		"planets.mars"(payload) {
			this.logger.info("mars is fired!");
		}

	}
});

// ----------------------------------------------------------------------

let broker2 = new ServiceBroker({
	nodeID: "node2",
	logger: true,
	logLevel: "debug",
	transporter: "NATS"
});

broker2.createService({
	name: "big-planets",
	events: {
		"planets.neptune"(payload) {
			this.logger.info("Neptune is fired!");
		},
		"planets.saturn"(payload) {
			this.logger.info("Saturn is fired!");
		}
	}
});

broker2.createService({
	name: "big-planets-2",
	events: {
		"planets.jupiter"(payload) {
			this.logger.info("Jupiter is fired!");
		},
		"planets.saturn"(payload) {
			this.logger.info("Saturn is fired!");
		}
	}
});

// ----------------------------------------------------------------------

broker1.Promise.resolve()
	.then(() => broker1.start())
	.delay(500)
	.then(() => broker2.start())
	.delay(500)
	//.then(() => broker1.call("math.add", { a: 7, b: 3 }))
	//.then(res => broker1.logger.info("Result:", res))
	.catch(err => broker1.logger.error(err))
	.then(() => broker1.repl());
