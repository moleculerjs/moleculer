"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "hot",
	//transporter: "TCP",
	logLevel: "debug",
	hotReload: {
		enabled: true,
		extraFiles: {
			"./README.md": "allServices"
		}
	}
});

broker.start().then(() => {

	/*
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

	}, 10000);

	setTimeout(() => {
		console.log("Destroy math service...");

		// Destroy a created service after 10s
		svc = broker.getLocalService("math");
		broker.destroyService(svc);

	}, 20000);

*/
	broker.loadService("./examples/hot.service");
	//broker.loadService("./examples/math.service.js");
	//broker.loadService("./examples/user.service.js");

	broker.repl();
});
