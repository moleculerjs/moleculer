/* eslint-disable no-console */

"use strict";

let _ = require("lodash");
let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	nodeID: "client-" + process.pid,
	logger: true,
	logLevel: "info",
	transporter: "NATS",
	registry: {
		strategy: "CpuUsage",
		strategyOptions: {
			lowCpuUsage: 0
		}
	}
});

let id = 1;

broker.start()
	.then(() => broker.repl())
	.then(() => setInterval(() => {
		broker.call("math.add", { id: id++, a: _.random(0, 100), b: _.random(0, 100) })
			.then(res => broker.logger.info("Response", res))
			.catch(err => broker.logger.error("Response error", err));
	}, 5000));
