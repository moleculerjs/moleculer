"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	transporter: "NATS",
	metrics: true,
	//logLevel: "debug",
	logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "test",
	actions: {
		empty(ctx) {

		},


	}
});

broker.loadService("./examples/stat.service.js");

broker.start()
	.then(() => broker.repl())
	.delay(1000)
	.then(() => broker.call("stat.snapshot"))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err));
