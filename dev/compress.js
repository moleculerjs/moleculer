"use strict";

const _ = require("lodash");
const Middlewares = require("..").Middlewares;
const ServiceBroker = require("../src/service-broker");

// Create broker
const broker = new ServiceBroker({
	transporter: "NATS",
	logLevel: {
		"TX-COMPRESS": "debug",
		"*": "info"
	},
	middlewares: [
		Middlewares.Transmit.Compression(),
	]
});

broker.start()
	.then(() => broker.repl())
	.then(() => {

	})
	.catch(err => broker.logger.error(err));
