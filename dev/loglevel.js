"use strict";

const ServiceBroker = require("../src/service-broker");
const { extend } = require("../src/logger");

const broker = new ServiceBroker({
	logger: {
		type: "Console",
		options: {
			//level: "warn"
			//formatter: (type, args, bindings) => [].concat(args, bindings)
		}
	},
	logLevel: {
		"MY.**": false,
		"TRANS*": "warn",
		"*.GREETER": "debug",
		"**": "debug",
	},
	//logFormatter: "short",
	transporter: "NATS",
	cacher: "Memory"
});

const schema = {
	created() {
		this.logger.debug("Service created!");
	},
	started() {
		this.logger.info("Service started!");
	}
};

broker.createService({
	name: "greeter",
	version: 2
}, schema);

broker.createService({
	name: "test"
}, schema);

broker.createService({
	name: "hello"
}, schema);

const myLogger = broker.getLogger("my.custom.module");

myLogger.trace("Test");
myLogger.debug("Test");
myLogger.info("Test");
myLogger.warn("Test");
myLogger.error("Test");

broker.start();
