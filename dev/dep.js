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
	name: "dep-test",
	settings: {
		$dependencyTimeout: 0
	},
	dependencies: [
		//{ name: "test", version: 2 },
		"math"
	],
	started() {
		this.logger.info("!!! SERVICE STARTED !!!");
		setInterval(() => {
			broker.call("math.add", { a: 5, b: 3 })
				.then(res => broker.logger.info(res))
				.catch(err => broker.logger.error(err));
		}, 500);
	}
});

broker.start().then(() => {
	broker.logger.info("!!! BROKER STARTED !!!");

	//broker.repl();
});
