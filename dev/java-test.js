"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "node-js",
	transporter: "redis://192.168.51.72:6379",
	//logLevel: "debug",
});

broker.loadService("./examples/math.service.js");

broker.start()
	.then(() => broker.repl())
	.then(() => {
		setInterval(() => {
			broker.sendPing().then(res => broker.logger.info("Ping result:", res));

		}, 2000);
	});
