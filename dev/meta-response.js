"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker #2
let broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
	logger: console,
	logFormatter: "simple"
});

broker2.createService({
	name: "auth",
	actions: {
		login(ctx) {
			ctx.meta.user = { name: "John" };
			return true;
		}
	}
});

broker2.start();
