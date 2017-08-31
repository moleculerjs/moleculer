/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "sender-" + process.pid,
	transporter: "NATS",
	logger: console
});

broker.createService({
	name: "event-sender",
	started() {
		setInterval(() => {
			this.logger.info("Send 'user.created' event");
			this.broker.emit("user.created");
		}, 2000);
	}
});

broker.start().then(() => {
	broker.repl();
});
