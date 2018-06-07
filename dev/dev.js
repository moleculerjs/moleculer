"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
	//logLevel: "debug",
	logObjectPrinter: o => util.inspect(o, { depth: 2, colors: true, breakLength: 100 }), // `breakLength: 50` activates multi-line object
	transporter: "TCP",
});

broker.createService({
	name: "test",
	actions: {
		empty(ctx) {

		},


	}
});


broker.start()
	.then(() => broker.repl())
	.delay(1000)
	.then(() => broker.call("$node.health"))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err));
