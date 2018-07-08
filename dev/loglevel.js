"use strict";

const ServiceBroker = require("../src/service-broker");
const { extend } = require("../src/logger");
const chalk = require("chalk");

const broker = new ServiceBroker({
	logger: console,
	logLevel: {
		"MY.**": false,
		"TRANS*": "warn",
		"*.GREETER": "debug",
		"**": "debug",
	},
	logFormatter: "short",
	transporter: "NATS",
	cacher: "Memory"
});

broker.createService({
	name: "greeter",
	version: 2,
	created() {
		this.logger.debug("Service created!");
	},
	started() {
		this.logger.info("Service started!");
	}
});

const myLogger = broker.getLogger("my.custom.module");

myLogger.info("Test");

broker.start();
