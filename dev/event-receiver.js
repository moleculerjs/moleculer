/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "receiver-" + process.pid,
	transporter: "NATS",
	//transporter: "amqp://192.168.0.181:5672",
	//disableBalancer: true,
	//serializer: "MsgPack",
	logger: console,
	logFormatter: "simple",
	//hotReload: true
});

broker.loadService("./examples/hot.service.js");

broker.createService({
	name: "users",
	events: {
		"user.created"(data, sender, eventName) {
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
