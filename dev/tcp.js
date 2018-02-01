/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker #1
let broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "TCP",
	logger: console,
	logFormatter: "simple",
	registry: {
		//preferLocal: false
	}
});

// Create broker #2
let broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "TCP",
	logger: console,
	logFormatter: "simple",
	registry: {
		//preferLocal: false
	}
});


broker1.Promise.all([
	broker1.start(),
	broker2.start()
]).delay(1000).then(() => {
	setInterval(() => {

	}, 2000);
});
