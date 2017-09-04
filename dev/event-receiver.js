/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "receiver-" + process.pid,
	//transporter: "NATS",
	transporter: "amqp://192.168.51.29:5672",
	//serializer: "ProtoBuf",
	logger: console,
	logFormatter: "simple"
});

broker.createService({
	name: "users",
	events: {
		"user.*"(data, sender, eventName) {
			this.logger.info(`USERS: '${eventName}' event received! ID: ${data.id}`);
		}
	}
});

broker.createService({
	name: "payment",
	version: 1,
	events: {
		"user.created"(data) {
			this.logger.info("PAYMENT: User created event received! ID:", data.id);
		}
	}
});


broker.start().then(() => {
	broker.repl();
});
