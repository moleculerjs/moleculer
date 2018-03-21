"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");

// Create broker
const broker = new ServiceBroker({
	nodeID: "streaming-sender",
	transporter: {
		type: "NATS",
		options: {
			//debug: true
		}
	},
	logger: console,
	logLevel: "debug"
});

broker.createService({
	name: "file",
	actions: {
		get(ctx) {
			const stream = fs.createReadStream("d://www.zip");
			return stream;
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
