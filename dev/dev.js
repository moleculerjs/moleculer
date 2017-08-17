/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");

let broker1 = new ServiceBroker({
	nodeID: "node1",
	logger: true,
	logLevel: "debug",
	transporter: "NATS"
});

//broker1.loadService("./examples/math.service");
//broker1.loadService("./examples/silent.service");
//broker1.loadService("./examples/post.service");

let broker2 = new ServiceBroker({
	nodeID: "node2",
	logger: true,
	logLevel: "debug",
	transporter: "NATS"
});

broker2.loadService("./examples/math.service");

broker1.Promise.resolve()
	.then(() => broker1.start())
	.then(() => broker2.start())
	.delay(500)
	.then(() => broker1.call("math.add", { a: 7, b: 3 }))
	.then(res => broker1.logger.info("Result:", res))
	.catch(err => broker1.logger.error(err))
	.then(() => broker1.repl());
