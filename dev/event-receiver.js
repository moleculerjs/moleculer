/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "receiver-" + process.pid,
	transporter: "NATS",
	logger: console
});

broker.createService({
	name: "users",
	events: {
		"user.created"(data, sender) {
			this.logger.info("User created event received!");
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
