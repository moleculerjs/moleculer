"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev",// + process.pid,
	//transporter: "mqtt://localhost:1833",
	transporter: {
		type: "MQTT",
		options: {
			host: "localhost",
			qos: 1,
			topicSeparator: "/"
		}
	},
	metrics: true,
	//logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "test",
	actions: {
		hello(ctx) {
			return "Hello Moleculer";
		}
	}
});

//broker.loadService("./examples/stat.service.js");

broker.start()
	.then(() => broker.repl());
/*	.delay(1000)
	.then(() => broker.call("stat.snapshot"))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err));
*/
