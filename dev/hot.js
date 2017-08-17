/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "hot-" + process.pid,
	transporter: "NATS",
	logger: console
});

broker.start().then(() => {

	let svc;
	setTimeout(() => {
		console.log("Create math service...");

		// Create a new service after 5s
		svc = broker.createService({
			name: "math",
			actions: {
				add(ctx) {
					return Number(ctx.params.a) + Number(ctx.params.b);
				},
			}
		});

	}, 5000);

	setTimeout(() => {
		console.log("Destroy math service...");

		// Destroy a created service after 10s
		svc = broker.getService("math");
		broker.destroyService(svc);

	}, 10000);

});
