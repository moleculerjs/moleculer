/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
	//logLevel: "debug",
	transporter: "TCP",
});

let svc = broker.loadService("examples/hot.service");

broker.start()
	.then(() => broker.repl())
	.delay(2000)
	.then(() => {
		console.log("Destroy hot service");
		broker.destroyService(svc);
	})
	.delay(1000)
	.then(() => broker.call("$node.actions", { onlyAvailable: true }).then(res => broker.logger.info(res)));
