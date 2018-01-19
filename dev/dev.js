/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	logger: true,
	logLevel: "debug",
});

broker.loadService("examples/es6.class.service");

broker.start()
	.then(() => broker.repl());
