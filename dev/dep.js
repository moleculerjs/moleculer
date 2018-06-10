"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "dep1",
	transporter: {
		type: "NATS",
		options: {
			//debug: true
		}
	},
	internalServices: false,
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

	methods: {
		work() {
			return broker.call("math.add", { a: 5, b: 3 })
				.then(res => broker.logger.info("Res: ", res))
				.catch(err => broker.logger.error("Error: ",err.message));
		}
	},

	started() {
		this.logger.info("!!! SERVICE STARTED !!!");
		this.work();

		setInterval(() => this.work(), 500);
	}
});

broker.start().then(() => {
	broker.logger.info("!!! BROKER STARTED !!!");

	//broker.repl();
});
